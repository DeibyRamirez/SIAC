import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  AlcanceTramiteSIAC,
  CategoriaAnexo,
  CodigoDocumentoGuia,
  EstadoEvidencia,
  EstadoVigencia,
  Prisma,
  RolUsuario,
  TipoTramiteSIAC,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { ServicioAlcancePrograma, UsuarioAlcance } from '../common/alcance/servicio-alcance-programa';
import {
  calcularAvancePonderado,
  calcularFechaFinVigencia,
  calcularSemaforoAvance,
  calcularSemaforoGeneral,
  calcularSemaforoVigencia,
  ColorSemaforoVigencia,
  esEstadoRevisado,
  redondear2,
  validarPesosTramite,
} from '../dominio/panel-siac';
import { ColorSemaforo } from '../dominio/puntaje-condiciones';
import { conEstadoCalculado, hayAnexoInfraestructuraVencido } from '../dominio/vigencia-anexo';
import { ConfiguracionSiacService } from '../configuracion/configuracion-siac.service';
import { ETIQUETAS_GUIA, tramitePorTipo } from './catalogo-tramites-siac';
import { ConsultaPanelProgramasDto } from './dto/consulta-panel-programas.dto';
import { porcentajeInternoEvidencia } from './avance-proceso-siac.service';
import { calcularSemaforo } from './programas.service';
import { ejecutarComoSistema } from '../prisma/contexto-sistema';
import { CatalogoCuacPersistenciaService } from '../integracion/catalogo-cuac-persistencia.service';
import { RevalidadorCatalogoCuacService } from '../integracion/revalidador-catalogo-cuac.service';
import { CacheConsultasProgramasService } from '../integracion/cache-consultas-programas.service';
import { enriquecerFilaDesdePersistencia } from '../integracion/cruzar-programa-carrera';

export interface DocumentoPanelDto {
  codigoGuia: CodigoDocumentoGuia;
  nombre: string;
  puntaje: number | null;
  totalCondiciones: number | null;
  porcentajeInterno: number;
  peso: number;
  aportacion: number;
  revisado: boolean;
}

export interface FilaPanelDto {
  id: string;
  nombre: string;
  codigo?: string;
  alcance: AlcanceTramiteSIAC;
  tipoTramite: TipoTramiteSIAC;
  avancePorcentual: number;
  semaforoAvance: ColorSemaforo;
  /** «SinVigencia» (gris) cuando no hay resolución MEN registrada; nunca verde. */
  semaforoVigencia: ColorSemaforoVigencia;
  semaforoGeneral: ColorSemaforo;
  documentos: DocumentoPanelDto[];
  anexoInfraestructuraVencido: boolean;
  /** Fecha de la resolución MEN vigente (ISO) o null si no se ha registrado. */
  fechaResolucion: string | null;
  /** Fin de vigencia = resolución + años configurados (ISO) o null. */
  fechaFinVigencia: string | null;
  /** Periodo (semestre) de la evidencia revisada más reciente usada en el cálculo. */
  semestre: string | null;
  activo?: boolean;
  urlImagen?: string | null;
  /** Título oficial del catálogo CUAC (si hay cruce). */
  tituloCatalogo?: string;
  duracion?: string;
  creditos?: number;
  resolucionCatalogo?: string;
  fechaResolucionCatalogo?: string;
  codigoSnies?: string;
  codigoCu?: string;
  nivel?: string;
  facultad?: string;
  modalidad?: string;
  imagenSlug?: string;
}

export interface MetadatosPanelCatalogoDto {
  version: string | null;
  degradado: boolean;
  revalidando: boolean;
  niveles: string[];
  facultades: string[];
  modalidades: string[];
}

export interface RespuestaPanelDto {
  datos: FilaPanelDto[];
  total: number;
  page: number;
  limit: number;
  totalPaginas: number;
  catalogoCuac?: MetadatosPanelCatalogoDto;
}

type PesosTramite = Map<CodigoDocumentoGuia, number>;

@Injectable()
export class PanelProgramasService implements OnModuleInit {
  private readonly logger = new Logger(PanelProgramasService.name);
  private pesosPorTramite = new Map<TipoTramiteSIAC, PesosTramite>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly alcance: ServicioAlcancePrograma,
    private readonly configuracion: ConfiguracionSiacService,
    private readonly catalogoCuac: CatalogoCuacPersistenciaService,
    private readonly revalidadorCuac: RevalidadorCatalogoCuacService,
    private readonly cacheConsultas: CacheConsultasProgramasService,
  ) {}

  /**
   * R-010.2a: carga umbrales y pesos de la BD; si son incoherentes el backend no arranca
   * (antes solo se registraba una advertencia y el panel calculaba con datos inválidos).
   */
  async onModuleInit(): Promise<void> {
    return ejecutarComoSistema(async () => {
      await this.configuracion.cargar();
      const tramites = await this.prisma.tramiteSIAC.findMany({
        include: { documentos: true },
      });

      for (const tramite of tramites) {
        const mapa = new Map<CodigoDocumentoGuia, number>();
        for (const doc of tramite.documentos) {
          mapa.set(doc.codigoGuia, doc.pesoPorcentaje);
        }
        try {
          validarPesosTramite(tramite.documentos.map((d) => d.pesoPorcentaje));
        } catch (error) {
          const mensaje = `Pesos inválidos en el trámite ${tramite.tipo}: ${(error as Error).message}`;
          this.logger.error(mensaje);
          throw new Error(mensaje);
        }
        this.pesosPorTramite.set(tramite.tipo, mapa);
      }
    });
  }

  async listarPanel(
    query: ConsultaPanelProgramasDto,
    usuario: UsuarioAlcance,
  ): Promise<RespuestaPanelDto> {
    const clave = this.cacheConsultas.clavePanel(query, usuario);
    const cacheada = this.cacheConsultas.leerPanel<RespuestaPanelDto>(clave);
    if (cacheada) {
      return {
        ...cacheada,
        catalogoCuac: cacheada.catalogoCuac
          ? { ...cacheada.catalogoCuac, revalidando: this.revalidadorCuac.estaRevalidando() }
          : undefined,
      };
    }

    const respuesta = await this.calcularPanel(query, usuario);
    this.cacheConsultas.guardarPanel(clave, respuesta);
    return respuesta;
  }

  private async calcularPanel(
    query: ConsultaPanelProgramasDto,
    usuario: UsuarioAlcance,
  ): Promise<RespuestaPanelDto> {
    // T-007.3a: relee los umbrales de BD (cambiar mesesRojoVigencia no exige redeploy).
    await this.configuracion.cargar();
    if (query.alcance === AlcanceTramiteSIAC.Institucion) {
      return this.panelInstitucion(query);
    }
    return this.panelProgramas(query, usuario);
  }

  private async panelInstitucion(query: ConsultaPanelProgramasDto): Promise<RespuestaPanelDto> {
    const institucion = await this.prisma.institucion.findFirst();
    if (!institucion) {
      return { datos: [], total: 0, page: 1, limit: query.limit ?? 20, totalPaginas: 0 };
    }

    const tipoTramite = query.tramite ?? institucion.tipoTramiteActivo;
    const tramite = tramitePorTipo(tipoTramite);
    if (tramite.alcance !== AlcanceTramiteSIAC.Institucion) {
      return { datos: [], total: 0, page: 1, limit: query.limit ?? 20, totalPaginas: 0 };
    }

    const evidencias = await this.prisma.evidencia.findMany({
      where: {
        institucionId: institucion.id,
        codigoGuia: { in: tramite.documentosGuia.map((d) => d.codigo) },
        estado: { in: this.estadosRevisados() },
      },
      select: {
        codigoGuia: true,
        estado: true,
        puntajeActual: true,
        totalCondicionesActual: true,
        updatedAt: true,
        periodo: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const fila = this.construirFila({
      id: institucion.id,
      nombre: institucion.nombre,
      codigo: institucion.codigo,
      alcance: AlcanceTramiteSIAC.Institucion,
      tipoTramite,
      fechaResolucion: institucion.fechaResolucion,
      anexos: [],
      evidencias,
      semestre: query.semestre,
    });

    const datos = this.filtrarPorSemaforo([fila], query.semaforo);
    return {
      datos,
      total: datos.length,
      page: 1,
      limit: query.limit ?? 20,
      totalPaginas: datos.length > 0 ? 1 : 0,
    };
  }

  private async panelProgramas(
    query: ConsultaPanelProgramasDto,
    usuario: UsuarioAlcance,
  ): Promise<RespuestaPanelDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = await this.filtroProgramas(usuario, query);
    const paginarEnBd = !query.semaforo;

    const totalBd = await this.prisma.programa.count({ where });
    const programas = await this.prisma.programa.findMany({
      where,
      orderBy: { nombre: 'asc' },
      ...(paginarEnBd ? { skip: (page - 1) * limit, take: limit } : {}),
      select: {
        id: true,
        nombre: true,
        tituloCuac: true,
        codigo: true,
        codigoCu: true,
        codigoSnies: true,
        nivel: true,
        modalidad: true,
        facultad: true,
        duracionCuac: true,
        creditosCuac: true,
        resolucionCuac: true,
        fechaResolucionCuac: true,
        imagenSlugCuac: true,
        tipoTramiteActivo: true,
        fechaResolucion: true,
        inicioCicloTramiteAt: true,
        activo: true,
        urlImagen: true,
      },
    });
    const metaBase = await this.catalogoCuac.obtenerMetadatosPanel();

    const meta: MetadatosPanelCatalogoDto = {
      ...metaBase,
      revalidando: this.revalidadorCuac.estaRevalidando(),
    };

    if (programas.length === 0) {
      const total = paginarEnBd ? totalBd : 0;
      return { datos: [], total, page, limit, totalPaginas: Math.ceil(total / limit), catalogoCuac: meta };
    }

    const ids = programas.map((p) => p.id);
    const guiasPrograma = [CodigoDocumentoGuia.G1, CodigoDocumentoGuia.G2];

    const anexos = await this.prisma.anexoVigencia
      .findMany({
        where: { programaId: { in: ids } },
        select: { programaId: true, estado: true, categoria: true, fechaVencimiento: true },
      })
      .then((filas) => filas.map((anexo) => conEstadoCalculado(anexo)));
    const evidencias = await this.prisma.evidencia.findMany({
      where: {
        programaId: { in: ids },
        codigoGuia: { in: guiasPrograma },
        estado: { in: this.estadosRevisados() },
      },
      select: {
        programaId: true,
        codigoGuia: true,
        estado: true,
        puntajeActual: true,
        totalCondicionesActual: true,
        updatedAt: true,
        createdAt: true,
        periodo: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const anexosPorPrograma = this.agrupar(anexos, (a) => a.programaId);
    const inicioCicloPorPrograma = new Map(programas.map((p) => [p.id, p.inicioCicloTramiteAt]));
    const evidenciasPorPrograma = this.agrupar(
      evidencias.filter((e) =>
        this.evidenciaCuentaEnPeriodo(e, query.semestre, inicioCicloPorPrograma),
      ),
      (e) => e.programaId ?? '',
    );

    const programasPorId = new Map(programas.map((p) => [p.id, p]));

    const filasBase = programas.map((programa) => {
      const tipoTramite = query.tramite ?? programa.tipoTramiteActivo;
      return this.construirFila({
        id: programa.id,
        nombre: programa.nombre,
        codigo: programa.codigo,
        alcance: AlcanceTramiteSIAC.Programa,
        tipoTramite,
        fechaResolucion: programa.fechaResolucion,
        activo: programa.activo,
        urlImagen: programa.urlImagen,
        anexos: anexosPorPrograma.get(programa.id) ?? [],
        evidencias: evidenciasPorPrograma.get(programa.id) ?? [],
        semestre: query.semestre,
      });
    });

    const baseImagenes = this.catalogoCuac.baseImagenes();
    const filas = filasBase.map((fila) => {
      const programa = programasPorId.get(fila.id);
      if (!programa) return fila;
      return enriquecerFilaDesdePersistencia(fila, programa, baseImagenes);
    });

    if (paginarEnBd) {
      return {
        datos: filas,
        total: totalBd,
        page,
        limit,
        totalPaginas: Math.ceil(totalBd / limit),
        catalogoCuac: meta,
      };
    }

    const filtradasSemaforo = this.filtrarPorSemaforo(filas, query.semaforo);
    const inicio = (page - 1) * limit;
    return {
      datos: filtradasSemaforo.slice(inicio, inicio + limit),
      total: filtradasSemaforo.length,
      page,
      limit,
      totalPaginas: Math.ceil(filtradasSemaforo.length / limit),
      catalogoCuac: meta,
    };
  }

  private construirFila(input: {
    id: string;
    nombre: string;
    codigo?: string;
    alcance: AlcanceTramiteSIAC;
    tipoTramite: TipoTramiteSIAC;
    fechaResolucion: Date | null;
    anexos: { estado: EstadoVigencia; categoria: CategoriaAnexo; fechaVencimiento: Date }[];
    evidencias: {
      codigoGuia: CodigoDocumentoGuia | null;
      estado: EstadoEvidencia;
      puntajeActual: number | null;
      totalCondicionesActual: number | null;
      updatedAt: Date;
      periodo: string;
    }[];
    semestre?: string;
    activo?: boolean;
    urlImagen?: string | null;
  }): FilaPanelDto {
    const tramite = tramitePorTipo(input.tipoTramite);
    const pesos = this.pesosPorTramite.get(input.tipoTramite) ?? new Map();

    const evidenciasFiltradas = input.semestre
      ? input.evidencias.filter((e) => e.periodo === input.semestre)
      : input.evidencias;

    const ultimaPorGuia = new Map<CodigoDocumentoGuia, (typeof input.evidencias)[0]>();
    for (const ev of evidenciasFiltradas) {
      if (!ev.codigoGuia || !esEstadoRevisado(ev.estado)) continue;
      if (!ultimaPorGuia.has(ev.codigoGuia)) {
        ultimaPorGuia.set(ev.codigoGuia, ev);
      }
    }

    const porcentajesBrutos = new Map<CodigoDocumentoGuia, number>();
    const documentos: DocumentoPanelDto[] = tramite.documentosGuia.map((docGuia) => {
      const codigo = docGuia.codigo;
      const peso = pesos.get(codigo) ?? docGuia.pesoPorcentaje;
      const evidencia = ultimaPorGuia.get(codigo);
      const revisado = !!evidencia;
      // R-010.1a: sin redondeos intermedios (antes 8/9 → 89 % → 80,1 en lugar de 80,0).
      const porcentajeBruto = evidencia ? porcentajeInternoEvidencia(evidencia) : 0;
      porcentajesBrutos.set(codigo, porcentajeBruto);
      const porcentajeInterno = redondear2(porcentajeBruto);
      const aportacion = redondear2((peso * porcentajeBruto) / 100);
      return {
        codigoGuia: codigo,
        nombre: ETIQUETAS_GUIA[codigo],
        puntaje: evidencia?.puntajeActual ?? null,
        totalCondiciones: evidencia?.totalCondicionesActual ?? null,
        porcentajeInterno,
        peso,
        aportacion,
        revisado,
      };
    });

    const tieneRevisados = documentos.some((d) => d.revisado);
    const avancePorcentual = tieneRevisados
      ? calcularAvancePonderado(
          documentos.map((d) => ({
            codigoGuia: d.codigoGuia,
            porcentajeInterno: porcentajesBrutos.get(d.codigoGuia) ?? 0,
            peso: d.peso,
          })),
        )
      : 0;

    // RN-003 (R-D): categoría explícita y vencimiento real del certificado.
    const anexoInfraestructuraVencido = hayAnexoInfraestructuraVencido(input.anexos);

    const umbrales = this.configuracion.obtener();
    const semaforoAvance = tieneRevisados ? calcularSemaforoAvance(avancePorcentual, umbrales) : 'Rojo';
    const semaforoVigencia = calcularSemaforoVigencia(input.fechaResolucion, new Date(), umbrales);
    const semaforoAnexos = calcularSemaforo(input.anexos);
    const semaforoGeneral = calcularSemaforoGeneral(
      colorMasCriticoPanel([semaforoAvance, semaforoAnexos]),
      semaforoVigencia,
      anexoInfraestructuraVencido,
    );

    return {
      id: input.id,
      nombre: input.nombre,
      codigo: input.codigo,
      alcance: input.alcance,
      tipoTramite: input.tipoTramite,
      avancePorcentual,
      semaforoAvance,
      semaforoVigencia,
      semaforoGeneral,
      documentos,
      anexoInfraestructuraVencido,
      fechaResolucion: input.fechaResolucion ? input.fechaResolucion.toISOString() : null,
      fechaFinVigencia: input.fechaResolucion
        ? calcularFechaFinVigencia(input.fechaResolucion, umbrales.aniosVigencia).toISOString()
        : null,
      semestre: semestreMasReciente(ultimaPorGuia),
      activo: input.activo,
      urlImagen: input.urlImagen,
    };
  }

  private filtrarPorSemaforo(filas: FilaPanelDto[], semaforo?: string): FilaPanelDto[] {
    if (!semaforo) return filas;
    const normalizado = semaforo.toLowerCase();
    return filas.filter((f) => f.semaforoGeneral.toLowerCase() === normalizado);
  }

  private filtroActivoPanel(
    usuario: UsuarioAlcance,
    query: ConsultaPanelProgramasDto,
  ): boolean | undefined {
    if (usuario.rol !== RolUsuario.Administrador && usuario.rol !== RolUsuario.SuperAdmin) {
      return true;
    }
    const estado = query.estado ?? 'activos';
    if (estado === 'todos') return undefined;
    if (estado === 'inactivos') return false;
    return true;
  }

  private async filtroProgramas(
    usuario: UsuarioAlcance,
    query: ConsultaPanelProgramasDto,
  ): Promise<Prisma.ProgramaWhereInput> {
    const where: Prisma.ProgramaWhereInput = {};
    const activoFiltro = this.filtroActivoPanel(usuario, query);
    if (activoFiltro !== undefined) {
      where.activo = activoFiltro;
    }

    if (query.tramite) {
      where.tipoTramiteActivo = query.tramite;
    }

    if (query.origen) {
      where.origenDato = query.origen;
    }

    if (query.nivel) {
      where.nivel = query.nivel;
    }

    if (query.facultad) {
      where.facultad = query.facultad;
    }

    if (query.modalidad) {
      where.modalidad = query.modalidad;
    }

    const texto = query.q?.trim();
    if (texto) {
      where.OR = [
        { nombre: { contains: texto, mode: 'insensitive' } },
        { codigo: { contains: texto, mode: 'insensitive' } },
      ];
    }

    if (usuario.rol === RolUsuario.Cargador || usuario.rol === RolUsuario.Revisor) {
      const ids = await this.alcance.idsProgramasAsignados(usuario.id);
      where.id = { in: ids };
    } else if (usuario.rol !== RolUsuario.Administrador && usuario.rol !== RolUsuario.SuperAdmin) {
      return { id: { in: [] } };
    }

    return where;
  }

  /**
   * Con semestre explícito se conservan todas las evidencias de ese periodo, aunque el ciclo
   * vigente haya empezado después. Sin semestre se mantiene el recorte al ciclo actual.
   */
  private evidenciaCuentaEnPeriodo(
    evidencia: { periodo: string; programaId: string | null; createdAt: Date },
    semestre: string | undefined,
    inicioCicloPorPrograma: { get(id: string): Date | null | undefined },
  ): boolean {
    if (semestre) return evidencia.periodo === semestre;
    const inicio = inicioCicloPorPrograma.get(evidencia.programaId ?? '');
    return inicio ? evidencia.createdAt.getTime() >= inicio.getTime() : true;
  }

  private estadosRevisados(): EstadoEvidencia[] {
    return [
      EstadoEvidencia.Cumple,
      EstadoEvidencia.ConObservaciones,
      EstadoEvidencia.Validado,
      EstadoEvidencia.Rechazado,
    ];
  }

  private agrupar<T>(filas: T[], clave: (fila: T) => string): Map<string, T[]> {
    const mapa = new Map<string, T[]>();
    for (const fila of filas) {
      const id = clave(fila);
      const lista = mapa.get(id);
      if (lista) lista.push(fila);
      else mapa.set(id, [fila]);
    }
    return mapa;
  }
}

function colorMasCriticoPanel(colores: ColorSemaforo[]): ColorSemaforo {
  if (colores.includes('Rojo')) return 'Rojo';
  if (colores.includes('Amarillo')) return 'Amarillo';
  return 'Verde';
}

/** Periodo de la evidencia revisada más reciente (las evidencias llegan ordenadas por fecha). */
function semestreMasReciente(
  ultimaPorGuia: Map<CodigoDocumentoGuia, { updatedAt: Date; periodo: string }>,
): string | null {
  let reciente: { updatedAt: Date; periodo: string } | null = null;
  for (const evidencia of ultimaPorGuia.values()) {
    if (!reciente || evidencia.updatedAt > reciente.updatedAt) reciente = evidencia;
  }
  return reciente?.periodo ?? null;
}
