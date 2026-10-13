import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import {
  CATEGORIAS_REGISTRO,
  EsquemaCategoriaCifras,
  obtenerEsquemaCategoria,
} from './esquemas/indice';

export interface FiltrosRegistrosCifras {
  periodo?: string;
  facultad?: string;
  /** Nombre exacto de programa (el servicio resuelve programaId → nombre). */
  programa?: string;
  sede?: string;
}

const TAMANO_LOTE_INSERT = 1000;

/**
 * Acceso Prisma a los registros por categoría (S3-03). Las filas que devuelve usan las
 * claves del catálogo de esquemas y nunca incluyen datos personales (columnas `personal`).
 */
@Injectable()
export class CifrasRegistrosRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  esCategoriaRegistros(categoriaId: string): boolean {
    return CATEGORIAS_REGISTRO.includes(categoriaId);
  }

  private whereEstudiantes(
    filtros: FiltrosRegistrosCifras,
  ): Prisma.RegistroEstudianteWhereInput {
    return {
      ...(filtros.periodo ? { periodoAcademico: filtros.periodo } : {}),
      ...(filtros.facultad ? { facultad: filtros.facultad } : {}),
      ...(filtros.programa ? { programa: filtros.programa } : {}),
    };
  }

  private whereProfesores(
    filtros: FiltrosRegistrosCifras,
  ): Prisma.RegistroProfesorWhereInput {
    return {
      ...(filtros.periodo ? { periodoAcademico: filtros.periodo } : {}),
      ...(filtros.facultad ? { facultad: filtros.facultad } : {}),
      ...(filtros.programa ? { programa: filtros.programa } : {}),
    };
  }

  private whereEgresados(
    filtros: FiltrosRegistrosCifras,
  ): Prisma.RegistroEgresadoWhereInput {
    return {
      ...(filtros.periodo ? { graduadosPeriodo: filtros.periodo } : {}),
      ...(filtros.facultad ? { facultad: filtros.facultad } : {}),
      ...(filtros.programa ? { programa: filtros.programa } : {}),
    };
  }

  private whereSemilleros(
    filtros: FiltrosRegistrosCifras,
  ): Prisma.RegistroSemilleroWhereInput {
    return {
      ...(filtros.periodo ? { periodoAcademico: filtros.periodo } : {}),
      ...(filtros.facultad ? { facultad: filtros.facultad } : {}),
      ...(filtros.programa ? { programa: filtros.programa } : {}),
    };
  }

  private whereAseguramiento(
    filtros: FiltrosRegistrosCifras,
  ): Prisma.ProgramaAseguramientoWhereInput {
    return {
      ...(filtros.periodo ? { periodoAcademico: filtros.periodo } : {}),
      ...(filtros.facultad ? { facultad: filtros.facultad } : {}),
      ...(filtros.programa ? { programas: filtros.programa } : {}),
    };
  }

  private whereInfraestructura(
    filtros: FiltrosRegistrosCifras,
  ): Prisma.SedeInfraestructuraWhereInput {
    return filtros.sede ? { sede: filtros.sede } : {};
  }

  async listarPeriodos(
    categoriaId: string,
    filtros: FiltrosRegistrosCifras = {},
  ): Promise<string[]> {
    switch (categoriaId) {
      case 'estudiantes': {
        const filas = await this.prisma.registroEstudiante.findMany({
          where: this.whereEstudiantes(filtros),
          distinct: ['periodoAcademico'],
          select: { periodoAcademico: true },
          orderBy: { periodoAcademico: 'desc' },
        });
        return filas.map((fila) => fila.periodoAcademico);
      }
      case 'profesores': {
        const filas = await this.prisma.registroProfesor.findMany({
          where: this.whereProfesores(filtros),
          distinct: ['periodoAcademico'],
          select: { periodoAcademico: true },
          orderBy: { periodoAcademico: 'desc' },
        });
        return filas.map((fila) => fila.periodoAcademico);
      }
      case 'egresados': {
        const filas = await this.prisma.registroEgresado.findMany({
          where: this.whereEgresados(filtros),
          distinct: ['graduadosPeriodo'],
          select: { graduadosPeriodo: true },
          orderBy: { graduadosPeriodo: 'desc' },
        });
        return filas.map((fila) => fila.graduadosPeriodo);
      }
      case 'investigacion': {
        const filas = await this.prisma.registroSemillero.findMany({
          where: this.whereSemilleros(filtros),
          distinct: ['periodoAcademico'],
          select: { periodoAcademico: true },
          orderBy: { periodoAcademico: 'desc' },
        });
        return filas.map((fila) => fila.periodoAcademico);
      }
      case 'aseguramiento': {
        const filas = await this.prisma.programaAseguramiento.findMany({
          where: this.whereAseguramiento(filtros),
          distinct: ['periodoAcademico'],
          select: { periodoAcademico: true },
          orderBy: { periodoAcademico: 'desc' },
        });
        return filas.map((fila) => fila.periodoAcademico);
      }
      default:
        return [];
    }
  }

  async contar(
    categoriaId: string,
    filtros: FiltrosRegistrosCifras = {},
  ): Promise<number> {    switch (categoriaId) {
      case 'estudiantes':
        return this.prisma.registroEstudiante.count({ where: this.whereEstudiantes(filtros) });
      case 'profesores':
        return this.prisma.registroProfesor.count({ where: this.whereProfesores(filtros) });
      case 'egresados':
        return this.prisma.registroEgresado.count({ where: this.whereEgresados(filtros) });
      case 'investigacion':
        return this.prisma.registroSemillero.count({ where: this.whereSemilleros(filtros) });
      case 'aseguramiento':
        return this.prisma.programaAseguramiento.count({
          where: this.whereAseguramiento(filtros),
        });
      case 'infraestructura':
        return this.prisma.sedeInfraestructura.count({
          where: this.whereInfraestructura(filtros),
        });
      default:
        return 0;
    }
  }

  /** Orden alfabético español, sin distinguir mayúsculas/tildes al comparar. */
  private soloValores(
    filas: ReadonlyArray<Record<string, unknown>>,
    campo: string,
  ): string[] {
    const valores = new Set<string>();
    for (const fila of filas) {
      const valor = String(fila[campo] ?? '').trim();
      if (valor) valores.add(valor);
    }
    return Array.from(valores).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' }),
    );
  }

  /** Facultades distintas reales de los registros (vacío si la categoría no tiene facultad). */
  async listarFacultades(categoriaId: string, periodo?: string): Promise<string[]> {
    switch (categoriaId) {
      case 'estudiantes': {
        const filas = await this.prisma.registroEstudiante.findMany({
          where: periodo ? { periodoAcademico: periodo } : {},
          distinct: ['facultad'],
          select: { facultad: true },
        });
        return this.soloValores(filas, 'facultad');
      }
      case 'profesores': {
        const filas = await this.prisma.registroProfesor.findMany({
          where: periodo ? { periodoAcademico: periodo } : {},
          distinct: ['facultad'],
          select: { facultad: true },
        });
        return this.soloValores(filas, 'facultad');
      }
      case 'egresados': {
        const filas = await this.prisma.registroEgresado.findMany({
          where: periodo ? { graduadosPeriodo: periodo } : {},
          distinct: ['facultad'],
          select: { facultad: true },
        });
        return this.soloValores(filas, 'facultad');
      }
      case 'investigacion': {
        const filas = await this.prisma.registroSemillero.findMany({
          where: periodo ? { periodoAcademico: periodo } : {},
          distinct: ['facultad'],
          select: { facultad: true },
        });
        return this.soloValores(filas, 'facultad');
      }
      case 'aseguramiento': {
        const filas = await this.prisma.programaAseguramiento.findMany({
          where: periodo ? { periodoAcademico: periodo } : {},
          distinct: ['facultad'],
          select: { facultad: true },
        });
        return this.soloValores(filas, 'facultad');
      }
      default:
        return [];
    }
  }

  /** Programas distintos reales; si se recibe facultad, solo los de esa facultad. */
  async listarProgramas(
    categoriaId: string,
    opciones: { periodo?: string; facultad?: string } = {},
  ): Promise<string[]> {
    switch (categoriaId) {
      case 'estudiantes': {
        const filas = await this.prisma.registroEstudiante.findMany({
          where: {
            ...(opciones.periodo ? { periodoAcademico: opciones.periodo } : {}),
            ...(opciones.facultad ? { facultad: opciones.facultad } : {}),
          },
          distinct: ['programa'],
          select: { programa: true },
        });
        return this.soloValores(filas, 'programa');
      }
      case 'profesores': {
        const filas = await this.prisma.registroProfesor.findMany({
          where: {
            ...(opciones.periodo ? { periodoAcademico: opciones.periodo } : {}),
            ...(opciones.facultad ? { facultad: opciones.facultad } : {}),
          },
          distinct: ['programa'],
          select: { programa: true },
        });
        return this.soloValores(filas, 'programa');
      }
      case 'egresados': {
        const filas = await this.prisma.registroEgresado.findMany({
          where: {
            ...(opciones.periodo ? { graduadosPeriodo: opciones.periodo } : {}),
            ...(opciones.facultad ? { facultad: opciones.facultad } : {}),
          },
          distinct: ['programa'],
          select: { programa: true },
        });
        return this.soloValores(filas, 'programa');
      }
      case 'investigacion': {
        const filas = await this.prisma.registroSemillero.findMany({
          where: {
            ...(opciones.periodo ? { periodoAcademico: opciones.periodo } : {}),
            ...(opciones.facultad ? { facultad: opciones.facultad } : {}),
          },
          distinct: ['programa'],
          select: { programa: true },
        });
        return this.soloValores(filas, 'programa');
      }
      case 'aseguramiento': {
        const filas = await this.prisma.programaAseguramiento.findMany({
          where: {
            ...(opciones.periodo ? { periodoAcademico: opciones.periodo } : {}),
            ...(opciones.facultad ? { facultad: opciones.facultad } : {}),
          },
          distinct: ['programas'],
          select: { programas: true },
        });
        return this.soloValores(filas, 'programas');
      }
      default:
        return [];
    }
  }

  /** Sedes distintas reales (solo infraestructura). */
  async listarSedes(categoriaId: string): Promise<string[]> {
    if (categoriaId !== 'infraestructura') return [];
    const filas = await this.prisma.sedeInfraestructura.findMany({
      distinct: ['sede'],
      select: { sede: true },
    });
    return this.soloValores(filas, 'sede');
  }

  /** Filas con claves del esquema (sin datos personales) para agregar o alimentar BI. */
  async consultar(
    categoriaId: string,
    filtros: FiltrosRegistrosCifras = {},
    paginacion?: { skip: number; take: number },
  ): Promise<Array<Record<string, unknown>>> {
    const esquema = obtenerEsquemaCategoria(categoriaId);
    if (!esquema) return [];
    const skip = paginacion?.skip;
    const take = paginacion?.take;

    let filas: Array<Record<string, unknown>>;
    switch (categoriaId) {
      case 'estudiantes':
        filas = await this.prisma.registroEstudiante.findMany({
          where: this.whereEstudiantes(filtros),
          orderBy: { id: 'asc' },
          skip,
          take,
        });
        break;
      case 'profesores':
        filas = await this.prisma.registroProfesor.findMany({
          where: this.whereProfesores(filtros),
          orderBy: { id: 'asc' },
          skip,
          take,
        });
        break;
      case 'egresados':
        filas = await this.prisma.registroEgresado.findMany({
          where: this.whereEgresados(filtros),
          orderBy: { id: 'asc' },
          skip,
          take,
        });
        break;
      case 'investigacion':
        filas = await this.prisma.registroSemillero.findMany({
          where: this.whereSemilleros(filtros),
          orderBy: { id: 'asc' },
          skip,
          take,
        });
        break;
      case 'aseguramiento':
        filas = await this.prisma.programaAseguramiento.findMany({
          where: this.whereAseguramiento(filtros),
          orderBy: { id: 'asc' },
          skip,
          take,
        });
        break;
      case 'infraestructura':
        filas = await this.prisma.sedeInfraestructura.findMany({
          where: this.whereInfraestructura(filtros),
          orderBy: { id: 'asc' },
          skip,
          take,
        });
        break;
      default:
        return [];
    }

    return filas.map((fila) => this.mapearFila(esquema, fila));
  }

  private mapearFila(
    esquema: EsquemaCategoriaCifras,
    fila: Record<string, unknown>,
  ): Record<string, unknown> {
    const salida: Record<string, unknown> = {};
    for (const columna of esquema.columnas) {
      if (columna.deprecada || columna.personal || !columna.campoPrisma) continue;
      salida[columna.clave] = fila[columna.campoPrisma];
    }
    return salida;
  }

  private aDatosPrisma(
    esquema: EsquemaCategoriaCifras,
    fila: Record<string, unknown>,
  ): Record<string, unknown> {
    const datos: Record<string, unknown> = {};
    for (const columna of esquema.columnas) {
      if (columna.deprecada || !columna.campoPrisma) continue;
      const valor = fila[columna.clave];
      datos[columna.campoPrisma] = valor === undefined ? null : valor;
    }
    return datos;
  }

  async resolverNombrePrograma(programaId: string): Promise<string | null> {
    const programa = await this.prisma.programa.findUnique({
      where: { id: programaId },
      select: { nombre: true },
    });
    return programa?.nombre ?? null;
  }

  /**
   * Reemplazo transaccional: borra los registros de la categoría con esas claves
   * (periodo académico/de graduación o sede) e inserta por lotes de 1000.
   */
  async reemplazar(
    categoriaId: string,
    claves: string[],
    filas: Array<Record<string, unknown>>,
    cargaId: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const esquema = obtenerEsquemaCategoria(categoriaId);
    if (!esquema || claves.length === 0) return 0;

    const datos = filas.map((fila) => ({
      ...this.aDatosPrisma(esquema, fila),
      cargaId,
    }));

    let insertados = 0;
    const insertarPorLotes = async (
      crear: (lote: unknown[]) => Promise<{ count: number }>,
    ) => {
      for (let i = 0; i < datos.length; i += TAMANO_LOTE_INSERT) {
        const resultado = await crear(datos.slice(i, i + TAMANO_LOTE_INSERT));
        insertados += resultado.count;
      }
    };

    switch (categoriaId) {
      case 'estudiantes':
        await tx.registroEstudiante.deleteMany({
          where: { periodoAcademico: { in: claves } },
        });
        await insertarPorLotes((lote) =>
          tx.registroEstudiante.createMany({
            data: lote as Prisma.RegistroEstudianteCreateManyInput[],
          }),
        );
        break;
      case 'profesores':
        await tx.registroProfesor.deleteMany({
          where: { periodoAcademico: { in: claves } },
        });
        await insertarPorLotes((lote) =>
          tx.registroProfesor.createMany({
            data: lote as Prisma.RegistroProfesorCreateManyInput[],
          }),
        );
        break;
      case 'egresados':
        await tx.registroEgresado.deleteMany({
          where: { graduadosPeriodo: { in: claves } },
        });
        await insertarPorLotes((lote) =>
          tx.registroEgresado.createMany({
            data: lote as Prisma.RegistroEgresadoCreateManyInput[],
          }),
        );
        break;
      case 'investigacion':
        await tx.registroSemillero.deleteMany({
          where: { periodoAcademico: { in: claves } },
        });
        await insertarPorLotes((lote) =>
          tx.registroSemillero.createMany({
            data: lote as Prisma.RegistroSemilleroCreateManyInput[],
          }),
        );
        break;
      case 'aseguramiento':
        await tx.programaAseguramiento.deleteMany({
          where: { periodoAcademico: { in: claves } },
        });
        await insertarPorLotes((lote) =>
          tx.programaAseguramiento.createMany({
            data: lote as Prisma.ProgramaAseguramientoCreateManyInput[],
          }),
        );
        break;
      case 'infraestructura':
        await tx.sedeInfraestructura.deleteMany({ where: { sede: { in: claves } } });
        await insertarPorLotes((lote) =>
          tx.sedeInfraestructura.createMany({
            data: lote as Prisma.SedeInfraestructuraCreateManyInput[],
          }),
        );
        break;
      default:
        return 0;
    }

    return insertados;
  }
}
