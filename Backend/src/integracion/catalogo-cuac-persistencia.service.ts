import { Injectable, Logger } from '@nestjs/common';
import { OrigenDato, Prisma, TipoTramiteSIAC } from '@prisma/client';
import { generarSlug } from '../common/alcance/generar-slug';
import { PrismaService } from '../prisma/prisma.module';
import { ejecutarComoSistema } from '../prisma/contexto-sistema';
import { ClienteCarrerasCuacService } from './cliente-carreras-cuac.service';
import {
  mapearCarrerasExternas,
  ProgramaCatalogoExterno,
  RespuestaCarrerasExternasDto,
} from './mapear-carrera-externa';

export const INTERVALO_REVALIDACION_CUAC_MS = 10 * 60 * 1000;

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
  ) {}

  baseImagenes(): string {
    return this.clienteCarreras.baseImagenes();
  }

  async aplicarRespuestaApi(
    datos: RespuestaCarrerasExternasDto,
  ): Promise<ResultadoPersistenciaCatalogo> {
    return ejecutarComoSistema(async () => {
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
    const [niveles, facultades, modalidades] = await Promise.all([
      this.valoresDistintos('nivel'),
      this.valoresDistintos('facultad'),
      this.valoresDistintos('modalidad'),
    ]);

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
    let importados = 0;
    let actualizados = 0;
    const ahora = new Date();

    for (const item of items) {
      const datosCatalogo = this.datosProgramaDesdeCatalogo(item, origen, ahora);

      const porIdExterno = await this.prisma.programa.findUnique({
        where: { idExterno: item.idExterno },
      });

      if (porIdExterno) {
        if (this.programaRequiereActualizacion(porIdExterno, item)) {
          await this.prisma.programa.update({
            where: { id: porIdExterno.id },
            data: datosCatalogo,
          });
          actualizados++;
        }
        continue;
      }

      const porCodigo = await this.prisma.programa.findUnique({ where: { codigo: item.codigo } });
      if (porCodigo) {
        if (this.programaRequiereActualizacion(porCodigo, item)) {
          await this.prisma.programa.update({
            where: { id: porCodigo.id },
            data: datosCatalogo,
          });
          actualizados++;
        }
        continue;
      }

      const porSlug = await this.prisma.programa.findUnique({ where: { slug: item.slug } });
      if (porSlug) {
        if (this.programaRequiereActualizacion(porSlug, item)) {
          await this.prisma.programa.update({
            where: { id: porSlug.id },
            data: datosCatalogo,
          });
          actualizados++;
        }
        continue;
      }

      const slugLibre = await this.resolverSlugEnBaseDeDatos(item.slug, item.idExterno, item.nombre);
      await this.prisma.programa.create({
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
      });
      importados++;
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

  private async resolverSlugEnBaseDeDatos(
    slugBase: string,
    idExterno: string,
    nombre: string,
  ): Promise<string> {
    const candidatos = [
      slugBase,
      generarSlug(`${nombre}-${idExterno.slice(-6)}`),
      generarSlug(idExterno),
    ];

    for (const candidato of candidatos) {
      const ocupado = await this.prisma.programa.findUnique({
        where: { slug: candidato },
        select: { id: true },
      });
      if (!ocupado) return candidato;
    }

    return generarSlug(`${idExterno}-${Date.now()}`);
  }
}
