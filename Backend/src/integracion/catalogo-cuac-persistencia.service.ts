import { Injectable, Logger } from '@nestjs/common';
import { OrigenDato, Prisma, TipoTramiteSIAC } from '@prisma/client';
import { generarSlug } from '../common/alcance/generar-slug';
import { PrismaService } from '../prisma/prisma.module';
import { ejecutarComoSistema } from '../prisma/contexto-sistema';
import { CacheConsultasProgramasService } from './cache-consultas-programas.service';
import { ClienteCarrerasCuacService } from './cliente-carreras-cuac.service';
import {
  mapearCarrerasExternas,
  ProgramaCatalogoExterno,
  RespuestaCarrerasExternasDto,
} from './mapear-carrera-externa';

export const INTERVALO_REVALIDACION_CUAC_MS = 10 * 60 * 1000;
const TAMANO_LOTE_CUAC = 25;

export interface ResultadoPersistenciaCatalogo {
  importados: number;
  actualizados: number;
  desactivados: number;
  total: number;
  totalEnBd: number;
  origen: OrigenDato;
}

@Injectable()
export class CatalogoCuacPersistenciaService {
  private readonly logger = new Logger(CatalogoCuacPersistenciaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clienteCarreras: ClienteCarrerasCuacService,
    private readonly cacheConsultas: CacheConsultasProgramasService,
  ) {}

  baseImagenes(): string {
    return this.clienteCarreras.baseImagenes();
  }

  async aplicarRespuestaApi(
    datos: RespuestaCarrerasExternasDto,
  ): Promise<ResultadoPersistenciaCatalogo> {
    const inicioMs = Date.now();
    const resultado = await ejecutarComoSistema(async () => {
      const baseImagenes = this.baseImagenes();
      const catalogo = mapearCarrerasExternas(datos.carreras, { baseImagenes });
      const { importados, actualizados } = await this.upsertCatalogoProgramas(catalogo, OrigenDato.API);
      const desactivados = await this.desactivarProgramasAusentesDelCatalogo(
        catalogo.map((item) => item.idExterno),
      );
      await this.actualizarMetadatosInstitucion(datos.version, new Date());
      const totalEnBd = await this.prisma.programa.count({ where: { origenDato: OrigenDato.API } });
      return {
        importados,
        actualizados,
        desactivados,
        total: catalogo.length,
        totalEnBd,
        origen: OrigenDato.API,
      };
    });
    this.cacheConsultas.invalidarTodo();
    this.logger.log(
      `Persistencia catálogo CUAC en ${Date.now() - inicioMs} ms (${resultado.importados} nuevos, ${resultado.actualizados} actualizados).`,
    );
    return resultado;
  }

  async obtenerMetadatosPanel(): Promise<{
    version: string | null;
    degradado: boolean;
    revalidando: boolean;
    niveles: string[];
    facultades: string[];
    modalidades: string[];
  }> {
    const institucion = await this.prisma.institucion.findFirst({
      select: { versionCatalogoCuac: true, catalogoCuacActualizadoEn: true },
    });

    const filtrosCache = this.cacheConsultas.leerFiltrosCatalogo();
    let niveles: string[];
    let facultades: string[];
    let modalidades: string[];
    if (filtrosCache) {
      ({ niveles, facultades, modalidades } = filtrosCache);
    } else {
      niveles = await this.valoresDistintos('nivel');
      facultades = await this.valoresDistintos('facultad');
      modalidades = await this.valoresDistintos('modalidad');
      this.cacheConsultas.guardarFiltrosCatalogo({ niveles, facultades, modalidades });
    }

    const degradado =
      !institucion?.catalogoCuacActualizadoEn &&
      niveles.length === 0 &&
      facultades.length === 0;

    return {
      version: institucion?.versionCatalogoCuac ?? null,
      degradado,
      revalidando: false,
      niveles,
      facultades,
      modalidades,
    };
  }

  async estaObsoleto(): Promise<boolean> {
    const institucion = await this.prisma.institucion.findFirst({
      select: { catalogoCuacActualizadoEn: true },
    });
    if (!institucion?.catalogoCuacActualizadoEn) return true;
    return Date.now() - institucion.catalogoCuacActualizadoEn.getTime() > INTERVALO_REVALIDACION_CUAC_MS;
  }

  private async valoresDistintos(campo: 'nivel' | 'facultad' | 'modalidad'): Promise<string[]> {
    if (campo === 'nivel') {
      const filas = await this.prisma.programa.findMany({
        where: { activo: true, tituloCuac: { not: null } },
        select: { nivel: true },
        distinct: ['nivel'],
      });
      return filas
        .map((fila) => fila.nivel)
        .filter((valor) => valor.trim().length > 0)
        .sort((a, b) => a.localeCompare(b, 'es'));
    }
    if (campo === 'facultad') {
      const filas = await this.prisma.programa.findMany({
        where: { activo: true, tituloCuac: { not: null }, facultad: { not: null } },
        select: { facultad: true },
        distinct: ['facultad'],
      });
      return filas
        .map((fila) => fila.facultad)
        .filter((valor): valor is string => Boolean(valor?.trim()))
        .sort((a, b) => a.localeCompare(b, 'es'));
    }
    const filas = await this.prisma.programa.findMany({
      where: { activo: true, tituloCuac: { not: null }, modalidad: { not: null } },
      select: { modalidad: true },
      distinct: ['modalidad'],
    });
    return filas
      .map((fila) => fila.modalidad)
      .filter((valor): valor is string => Boolean(valor?.trim()))
      .sort((a, b) => a.localeCompare(b, 'es'));
  }

  private async actualizarMetadatosInstitucion(version: string | undefined, cuando: Date): Promise<void> {
    const institucion = await this.prisma.institucion.findFirst({ select: { id: true } });
    if (!institucion) return;
    await this.prisma.institucion.update({
      where: { id: institucion.id },
      data: {
        versionCatalogoCuac: version?.trim() || null,
        catalogoCuacActualizadoEn: cuando,
      },
    });
  }

  private datosProgramaDesdeCatalogo(
    item: ProgramaCatalogoExterno,
    origen: OrigenDato,
    ahora: Date,
  ): Prisma.ProgramaUpdateInput {
    return {
      nombre: item.nombre,
      tituloCuac: item.nombre,
      codigoCu: item.codigoCu,
      codigoSnies: item.codigoSnies,
      nivel: item.nivel,
      modalidad: item.modalidad,
      facultad: item.facultad,
      duracionSemestres: item.duracionSemestres,
      duracionCuac: item.duracionCuac,
      creditosCuac: item.creditosCuac,
      resolucionCuac: item.resolucionCuac,
      fechaResolucionCuac: item.fechaResolucionCuac,
      imagenSlugCuac: item.imagenSlugCuac,
      urlImagen: item.urlImagen,
      activo: item.activo,
      idExterno: item.idExterno,
      origenDato: origen,
      fechaSincronizacion: ahora,
    };
  }

  private async upsertCatalogoProgramas(
    items: ProgramaCatalogoExterno[],
    origen: OrigenDato,
  ): Promise<{ importados: number; actualizados: number }> {
    if (items.length === 0) return { importados: 0, actualizados: 0 };

    let importados = 0;
    let actualizados = 0;
    const ahora = new Date();

    const existentes = await this.prisma.programa.findMany({
      select: {
        id: true,
        idExterno: true,
        codigo: true,
        slug: true,
        nombre: true,
        tituloCuac: true,
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
        urlImagen: true,
        activo: true,
      },
    });

    const porIdExterno = new Map<string, (typeof existentes)[0]>();
    const porCodigo = new Map<string, (typeof existentes)[0]>();
    const porSlug = new Map<string, (typeof existentes)[0]>();
    const slugsOcupados = new Set<string>();

    for (const fila of existentes) {
      slugsOcupados.add(fila.slug);
      if (fila.idExterno) porIdExterno.set(fila.idExterno, fila);
      porCodigo.set(fila.codigo, fila);
      porSlug.set(fila.slug, fila);
    }

    const operaciones: Prisma.PrismaPromise<unknown>[] = [];

    for (const item of items) {
      const datosCatalogo = this.datosProgramaDesdeCatalogo(item, origen, ahora);
      const existente =
        porIdExterno.get(item.idExterno) ??
        porCodigo.get(item.codigo) ??
        porSlug.get(item.slug);

      if (existente) {
        if (this.programaRequiereActualizacion(existente, item)) {
          operaciones.push(
            this.prisma.programa.update({
              where: { id: existente.id },
              data: datosCatalogo,
            }),
          );
          actualizados++;
        }
        if (item.idExterno) porIdExterno.set(item.idExterno, existente);
        continue;
      }

      const slugLibre = this.resolverSlugEnMemoria(item.slug, item.idExterno, item.nombre, slugsOcupados);
      operaciones.push(
        this.prisma.programa.create({
          data: {
            codigo: item.codigo,
            nombre: item.nombre,
            tituloCuac: item.nombre,
            slug: slugLibre,
            codigoCu: item.codigoCu,
            codigoSnies: item.codigoSnies,
            nivel: item.nivel,
            modalidad: item.modalidad,
            facultad: item.facultad,
            duracionSemestres: item.duracionSemestres,
            duracionCuac: item.duracionCuac,
            creditosCuac: item.creditosCuac,
            resolucionCuac: item.resolucionCuac,
            fechaResolucionCuac: item.fechaResolucionCuac,
            imagenSlugCuac: item.imagenSlugCuac,
            urlImagen: item.urlImagen,
            activo: item.activo,
            idExterno: item.idExterno,
            origenDato: origen,
            fechaSincronizacion: ahora,
            tipoTramiteActivo: TipoTramiteSIAC.RenovacionRegistroCalificado,
            porcentajeAvance: 0,
            estadoProceso: 'En progreso',
          },
        }),
      );
      importados++;
      const stub = {
        id: `nuevo-${item.idExterno}`,
        idExterno: item.idExterno,
        codigo: item.codigo,
        slug: slugLibre,
        nombre: item.nombre,
        tituloCuac: item.nombre,
        codigoCu: item.codigoCu ?? null,
        codigoSnies: item.codigoSnies ?? null,
        nivel: item.nivel,
        modalidad: item.modalidad ?? null,
        facultad: item.facultad ?? null,
        duracionCuac: item.duracionCuac ?? null,
        creditosCuac: item.creditosCuac ?? null,
        resolucionCuac: item.resolucionCuac ?? null,
        fechaResolucionCuac: item.fechaResolucionCuac ?? null,
        imagenSlugCuac: item.imagenSlugCuac ?? null,
        urlImagen: item.urlImagen ?? null,
        activo: item.activo,
      };
      porIdExterno.set(item.idExterno, stub);
      porCodigo.set(item.codigo, stub);
      porSlug.set(slugLibre, stub);
    }

    for (let i = 0; i < operaciones.length; i += TAMANO_LOTE_CUAC) {
      const lote = operaciones.slice(i, i + TAMANO_LOTE_CUAC);
      await this.prisma.$transaction(lote);
    }

    return { importados, actualizados };
  }

  private programaRequiereActualizacion(
    existente: {
      nombre: string;
      tituloCuac: string | null;
      codigoCu: string | null;
      codigoSnies: string | null;
      nivel: string;
      modalidad: string | null;
      facultad: string | null;
      duracionCuac: string | null;
      creditosCuac: number | null;
      resolucionCuac: string | null;
      fechaResolucionCuac: Date | null;
      imagenSlugCuac: string | null;
      urlImagen: string | null;
      activo: boolean;
    },
    item: ProgramaCatalogoExterno,
  ): boolean {
    const fechaItem = item.fechaResolucionCuac?.getTime() ?? null;
    const fechaExistente = existente.fechaResolucionCuac?.getTime() ?? null;
    return (
      existente.nombre !== item.nombre ||
      existente.tituloCuac !== item.nombre ||
      existente.codigoCu !== (item.codigoCu ?? null) ||
      existente.codigoSnies !== (item.codigoSnies ?? null) ||
      existente.nivel !== item.nivel ||
      existente.modalidad !== (item.modalidad ?? null) ||
      existente.facultad !== (item.facultad ?? null) ||
      existente.duracionCuac !== (item.duracionCuac ?? null) ||
      existente.creditosCuac !== (item.creditosCuac ?? null) ||
      existente.resolucionCuac !== (item.resolucionCuac ?? null) ||
      fechaExistente !== fechaItem ||
      existente.imagenSlugCuac !== (item.imagenSlugCuac ?? null) ||
      existente.urlImagen !== (item.urlImagen ?? null) ||
      existente.activo !== item.activo
    );
  }

  private async desactivarProgramasAusentesDelCatalogo(idsExternosActivos: string[]): Promise<number> {
    const resultado = await this.prisma.programa.updateMany({
      where: {
        origenDato: OrigenDato.API,
        idExterno: { not: null, notIn: idsExternosActivos },
        activo: true,
      },
      data: { activo: false },
    });
    return resultado.count;
  }

  private resolverSlugEnMemoria(
    slugBase: string,
    idExterno: string,
    nombre: string,
    slugsOcupados: Set<string>,
  ): string {
    const candidatos = [
      slugBase,
      generarSlug(`${nombre}-${idExterno.slice(-6)}`),
      generarSlug(idExterno),
    ];

    for (const candidato of candidatos) {
      if (!slugsOcupados.has(candidato)) {
        slugsOcupados.add(candidato);
        return candidato;
      }
    }

    const fallback = generarSlug(`${idExterno}-${Date.now()}`);
    slugsOcupados.add(fallback);
    return fallback;
  }
}
