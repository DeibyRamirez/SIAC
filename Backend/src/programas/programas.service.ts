import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoEvidencia, EstadoVigencia, OrigenDato, Prisma, RolUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CrearProgramaDto } from './dto/crear-programa.dto';
import { ActualizarProgramaDto } from './dto/actualizar-programa.dto';
import { AvanceProcesoSIACService } from './avance-proceso-siac.service';
import { ServicioAlcancePrograma, UsuarioAlcance } from '../common/alcance/servicio-alcance-programa';
import { generarSlug } from '../common/alcance/generar-slug';
import {
  ColorSemaforo,
  colorMasCritico,
  colorPorPuntaje,
} from '../dominio/puntaje-condiciones';

export interface ConteosEstadoPrograma {
  borrador: number;
  enRevision: number;
  conObservaciones: number;
  cumple: number;
  validado: number;
  rechazado: number;
}

@Injectable()
export class ProgramaRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  listar(where: Prisma.ProgramaWhereInput = {}) {
    return this.prisma.programa.findMany({ where, orderBy: { nombre: 'asc' } });
  }

  buscarPorId(id: string) {
    return this.prisma.programa.findUnique({ where: { id } });
  }

  listarAnexosDeProgramas(programaIds: string[]) {
    return this.prisma.anexoVigencia.findMany({
      where: { programaId: { in: programaIds } },
      select: { programaId: true, estado: true, tipo: true },
    });
  }

  agruparEvidenciasPorEstado(programaIds: string[]) {
    return this.prisma.evidencia.groupBy({
      by: ['programaId', 'estado'],
      where: { programaId: { in: programaIds } },
      _count: { _all: true },
    });
  }

  listarEvidenciasParaAvance(programaIds: string[]) {
    return this.prisma.evidencia.findMany({
      where: { programaId: { in: programaIds } },
      select: {
        programaId: true,
        documentoRequeridoId: true,
        puntajeActual: true,
        totalCondicionesActual: true,
        estado: true,
        updatedAt: true,
      },
    });
  }

  listarIdsDocumentosObligatorios() {
    return this.prisma.documentoRequerido.findMany({
      where: { obligatorio: true },
      select: { id: true },
    });
  }

  listarEstadosEvidencia(programaId: string) {
    return this.prisma.evidencia.findMany({
      where: { programaId },
      select: { estado: true },
    });
  }

  crear(datos: Prisma.ProgramaCreateInput) {
    return this.prisma.programa.create({ data: datos });
  }

  actualizar(id: string, datos: Prisma.ProgramaUpdateInput) {
    return this.prisma.programa.update({ where: { id }, data: datos });
  }

  buscarPorCodigo(codigo: string) {
    return this.prisma.programa.findUnique({ where: { codigo } });
  }

  buscarPorSlug(slug: string) {
    return this.prisma.programa.findUnique({ where: { slug } });
  }
}

@Injectable()
export class ProgramasService {
  constructor(
    private readonly programaRepo: ProgramaRepositorio,
    private readonly alcance: ServicioAlcancePrograma,
    private readonly avanceProceso: AvanceProcesoSIACService,
  ) {}

  async crear(dto: CrearProgramaDto) {
    const codigo = await this.generarCodigoUnico(dto.nombre);
    const slug = await this.generarSlugUnico(dto.nombre);
    return this.programaRepo.crear({
      nombre: dto.nombre.trim(),
      codigo,
      slug,
      nivel: dto.nivel,
      facultad: dto.facultad?.trim() || null,
      origenDato: OrigenDato.Manual,
      semaforo: 'Verde',
      porcentajeAvance: 0,
      estadoProceso: 'En progreso',
    });
  }

  async actualizar(id: string, dto: ActualizarProgramaDto) {
    const programa = await this.programaRepo.buscarPorId(id);
    if (!programa) throw new NotFoundException('Programa no encontrado.');

    const datos: Prisma.ProgramaUpdateInput = {};
    if (dto.nombre !== undefined) {
      datos.nombre = dto.nombre.trim();
      datos.slug = await this.generarSlugUnico(dto.nombre, id);
    }
    if (dto.nivel !== undefined) datos.nivel = dto.nivel;
    if (dto.facultad !== undefined) datos.facultad = dto.facultad.trim() || null;
    if (dto.modalidad !== undefined) datos.modalidad = dto.modalidad.trim() || null;
    if (dto.codigoSnies !== undefined) datos.codigoSnies = dto.codigoSnies.trim() || null;
    if (dto.duracionSemestres !== undefined) datos.duracionSemestres = dto.duracionSemestres;

    return this.programaRepo.actualizar(id, datos);
  }

  async actualizarEstado(id: string, activo: boolean) {
    const programa = await this.programaRepo.buscarPorId(id);
    if (!programa) throw new NotFoundException('Programa no encontrado.');
    return this.programaRepo.actualizar(id, { activo });
  }

  async listarConSemaforo(usuario: UsuarioAlcance) {
    const programas = await this.programaRepo.listar(await this.filtroListado(usuario));
    return this.enriquecer(programas);
  }

  async obtenerPorId(id: string) {
    const programa = await this.programaRepo.buscarPorId(id);
    if (!programa) throw new NotFoundException('Programa no encontrado.');

    const [enriquecido] = await this.enriquecer([programa]);
    const evidencias = await this.programaRepo.listarEstadosEvidencia(id);
    const anexos = (await this.programaRepo.listarAnexosDeProgramas([id])).map((anexo) => ({
      estado: anexo.estado,
      tipo: anexo.tipo,
    }));

    return {
      ...enriquecido,
      evidencias,
      anexos,
    };
  }

  private async filtroListado(usuario: UsuarioAlcance): Promise<Prisma.ProgramaWhereInput> {
    if (usuario.rol === RolUsuario.Administrador || usuario.rol === RolUsuario.SuperAdmin) {
      return {};
    }
    if (usuario.rol === RolUsuario.Cargador || usuario.rol === RolUsuario.Revisor) {
      const ids = await this.alcance.idsProgramasAsignados(usuario.id);
      return { id: { in: ids }, activo: true };
    }
    return { activo: true };
  }

  /**
   * Calcula semáforo y avance al leer. No escribe en la base (P18, sin N+1).
   * Semáforo (D2): RN-003 y la heurística de anexos vigente, combinados con el color del
   * puntaje n/9 de cada documento verificado (verde 9, amarillo 5-8, rojo 0-4). Un documento
   * con observaciones toma el color de su puntaje; no fuerza rojo. El rediseño completo es de T-010.2.
   */
  private async enriquecer<T extends { id: string; semaforo: string; porcentajeAvance: number }>(
    programas: T[],
  ) {
    if (programas.length === 0) return [];

    const ids = programas.map((programa) => programa.id);
    const [anexos, grupos, progresos] = await Promise.all([
      this.programaRepo.listarAnexosDeProgramas(ids),
      this.programaRepo.agruparEvidenciasPorEstado(ids),
      Promise.all(programas.map((p) => this.avanceProceso.calcularProgresoPrograma(p.id))),
    ]);

    const anexosPorPrograma = agrupar(anexos, (anexo) => anexo.programaId);
    const progresoPorPrograma = new Map(progresos.map((p) => [p.programaId, p]));
    const conteosPorPrograma = new Map<string, ConteosEstadoPrograma>();

    for (const grupo of grupos) {
      if (!grupo.programaId) continue;
      const conteos = conteosPorPrograma.get(grupo.programaId) ?? conteosVacios();
      sumarConteo(conteos, grupo.estado, grupo._count._all);
      conteosPorPrograma.set(grupo.programaId, conteos);
    }

    return programas.map((programa) => {
      const conteos = conteosPorPrograma.get(programa.id) ?? conteosVacios();
      const progreso = progresoPorPrograma.get(programa.id);
      const documentos = progreso?.documentos ?? [];
      const tieneObservaciones = documentos.some(
        (doc) => doc.conObservaciones || doc.rechazado,
      );
      const anexosPrograma = anexosPorPrograma.get(programa.id) ?? [];
      const semaforo = calcularSemaforoPrograma(anexosPrograma, documentos);

      const avanceGlobal = progreso?.avanceGlobal ?? programa.porcentajeAvance;
      const estadoProceso =
        avanceGlobal >= 100 && !tieneObservaciones
          ? 'Completado'
          : tieneObservaciones
            ? 'Con observaciones'
            : 'En progreso';

      return {
        ...programa,
        semaforo,
        porcentajeAvance: avanceGlobal,
        estadoProceso,
        evidenciasValidadas: conteos.validado,
        totalEvidencias:
          conteos.borrador +
          conteos.enRevision +
          conteos.conObservaciones +
          conteos.cumple +
          conteos.validado +
          conteos.rechazado,
        conteosEstado: conteos,
      };
    });
  }

  private async generarCodigoUnico(nombre: string): Promise<string> {
    const codigoBase = nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 12)
      .toUpperCase();

    let codigo = codigoBase || 'PROG';
    let intento = 0;
    while (intento < 20) {
      const existe = await this.programaRepo.buscarPorCodigo(codigo);
      if (!existe) return codigo;
      intento += 1;
      codigo = `${codigoBase.slice(0, 8)}-${intento}`.slice(0, 20);
    }
    throw new ConflictException('No se pudo generar un código único para el programa.');
  }

  private async generarSlugUnico(nombre: string, excluirId?: string): Promise<string> {
    const base = generarSlug(nombre).slice(0, 140);
    let slug = base;
    let intento = 2;
    while (intento < 50) {
      const existe = await this.programaRepo.buscarPorSlug(slug);
      if (!existe || existe.id === excluirId) return slug;
      slug = `${base}-${intento}`.slice(0, 160);
      intento += 1;
    }
    throw new ConflictException('No se pudo generar un slug único para el programa.');
  }
}

function conteosVacios(): ConteosEstadoPrograma {
  return {
    borrador: 0,
    enRevision: 0,
    conObservaciones: 0,
    cumple: 0,
    validado: 0,
    rechazado: 0,
  };
}

function sumarConteo(conteos: ConteosEstadoPrograma, estado: EstadoEvidencia, cantidad: number) {
  if (estado === EstadoEvidencia.Borrador) conteos.borrador += cantidad;
  if (estado === EstadoEvidencia.EnRevision) conteos.enRevision += cantidad;
  if (estado === EstadoEvidencia.Validado) conteos.validado += cantidad;
  if (estado === EstadoEvidencia.Rechazado) conteos.rechazado += cantidad;
  if (estado === EstadoEvidencia.ConObservaciones) conteos.conObservaciones += cantidad;
  if (estado === EstadoEvidencia.Cumple) conteos.cumple += cantidad;
}

function agrupar<T>(filas: T[], clave: (fila: T) => string): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const fila of filas) {
    const id = clave(fila);
    const lista = mapa.get(id);
    if (lista) lista.push(fila);
    else mapa.set(id, [fila]);
  }
  return mapa;
}

/** RN-003 vigente: anexo de infraestructura vencido → rojo. El resto sigue la heurística actual. */
export function calcularSemaforo(anexos: { estado: EstadoVigencia; tipo: string }[]): ColorSemaforo {
  const infraVencido = anexos.some(
    (anexo) =>
      anexo.estado === EstadoVigencia.Vencido &&
      anexo.tipo.toLowerCase().includes('infraestructura'),
  );
  if (infraVencido) return 'Rojo';

  if (anexos.some((anexo) => anexo.estado === EstadoVigencia.Proximo)) return 'Amarillo';
  if (anexos.some((anexo) => anexo.estado === EstadoVigencia.Vencido)) return 'Rojo';
  return 'Verde';
}

/**
 * Semáforo del programa: RN-003 (infraestructura vencida => rojo) prevalece; si no, gana el
 * color más crítico entre los anexos y el puntaje n/total de cada documento ya verificado.
 */
export function calcularSemaforoPrograma(
  anexos: { estado: EstadoVigencia; tipo: string }[],
  documentos: { puntaje: number | null; totalCondiciones: number | null }[],
): ColorSemaforo {
  const colorAnexos = calcularSemaforo(anexos);
  if (colorAnexos === 'Rojo') return 'Rojo';

  const coloresPuntaje = documentos
    .filter(
      (doc): doc is { puntaje: number; totalCondiciones: number } =>
        doc.puntaje !== null && !!doc.totalCondiciones,
    )
    .map((doc) => colorPorPuntaje(doc.puntaje, doc.totalCondiciones));

  return colorMasCritico([colorAnexos, ...coloresPuntaje]);
}
