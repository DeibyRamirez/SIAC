import { Injectable } from '@nestjs/common';
import {
  CargaCifras,
  CifraIndicador,
  FuenteCifra,
  Prisma,
  VariableCifra,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';

export type CifraConVariable = CifraIndicador & { variable: VariableCifra };

export interface DatosCifraIndicador {
  categoriaId: string;
  variableId: string;
  periodo: string;
  facultad?: string | null;
  programaId?: string | null;
  sede?: string | null;
  dimension?: string | null;
  valorDimension?: string | null;
  valor: number;
  fuente: FuenteCifra;
  cargaId?: string | null;
}

export interface DatosCargaCifras {
  categoriaId: string;
  fuente: FuenteCifra;
  nombreArchivo?: string | null;
  filasOk: number;
  filasError: number;
  errores?: Prisma.InputJsonValue;
  usuarioId?: string | null;
}

/**
 * Repositorio Prisma del módulo de cifras (HU-009). Toda escritura pasa por aquí
 * para mantener la capa controller -> service -> repositorio.
 */
@Injectable()
export class CifrasRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  private cliente(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  async listarVariables(categoriaId?: string): Promise<VariableCifra[]> {
    return this.prisma.variableCifra.findMany({
      where: categoriaId ? { categoriaId } : {},
      orderBy: [{ categoriaId: 'asc' }, { clave: 'asc' }],
    });
  }

  async listarVariablesActivas(categoriaId: string): Promise<VariableCifra[]> {
    return this.prisma.variableCifra.findMany({
      where: { categoriaId, activo: true },
      orderBy: { clave: 'asc' },
    });
  }

  async buscarVariable(categoriaId: string, clave: string): Promise<VariableCifra | null> {
    return this.prisma.variableCifra.findUnique({
      where: { categoriaId_clave: { categoriaId, clave } },
    });
  }

  async buscarVariablePorId(id: string): Promise<VariableCifra | null> {
    return this.prisma.variableCifra.findUnique({ where: { id } });
  }

  async actualizarVariable(
    id: string,
    datos: Prisma.VariableCifraUpdateInput,
  ): Promise<VariableCifra> {
    return this.prisma.variableCifra.update({ where: { id }, data: datos });
  }

  async listarPeriodos(
    categoriaId: string,
    filtros?: { facultad?: string; programaId?: string; sede?: string },
  ): Promise<string[]> {
    const filas = await this.prisma.cifraIndicador.findMany({
      where: {
        categoriaId,
        ...(filtros?.facultad ? { facultad: filtros.facultad } : {}),
        ...(filtros?.programaId ? { programaId: filtros.programaId } : {}),
        ...(filtros?.sede ? { sede: filtros.sede } : {}),
      },
      distinct: ['periodo'],
      select: { periodo: true },
      orderBy: { periodo: 'desc' },
    });
    return filas.map((fila) => fila.periodo);
  }

  async consultarIndicadores(
    where: Prisma.CifraIndicadorWhereInput,
  ): Promise<CifraConVariable[]> {
    return this.prisma.cifraIndicador.findMany({
      where,
      include: { variable: true },
      orderBy: { variableId: 'asc' },
    });
  }

  async buscarProgramaPorCodigo(codigo: string) {
    return this.prisma.programa.findFirst({
      where: { OR: [{ codigoSnies: codigo }, { codigo }] },
    });
  }

  /**
   * Upsert lógico: la misma (variable, periodo, facultad, programa, sede, dimension,
   * valorDimension) reemplaza el valor anterior.
   */
  async reemplazarValor(
    datos: DatosCifraIndicador,
    tx?: Prisma.TransactionClient,
  ): Promise<CifraIndicador> {
    const cliente = this.cliente(tx);
    const existente = await cliente.cifraIndicador.findFirst({
      where: {
        variableId: datos.variableId,
        periodo: datos.periodo,
        facultad: datos.facultad ?? null,
        programaId: datos.programaId ?? null,
        sede: datos.sede ?? null,
        dimension: datos.dimension ?? null,
        valorDimension: datos.valorDimension ?? null,
      },
    });

    if (existente) {
      return cliente.cifraIndicador.update({
        where: { id: existente.id },
        data: {
          valor: datos.valor,
          fuente: datos.fuente,
          cargaId: datos.cargaId ?? null,
        },
      });
    }

    return cliente.cifraIndicador.create({
      data: {
        categoriaId: datos.categoriaId,
        variableId: datos.variableId,
        periodo: datos.periodo,
        facultad: datos.facultad ?? null,
        programaId: datos.programaId ?? null,
        sede: datos.sede ?? null,
        dimension: datos.dimension ?? null,
        valorDimension: datos.valorDimension ?? null,
        valor: datos.valor,
        fuente: datos.fuente,
        cargaId: datos.cargaId ?? null,
      },
    });
  }

  async crearCarga(
    datos: DatosCargaCifras,
    tx?: Prisma.TransactionClient,
  ): Promise<CargaCifras> {
    return this.cliente(tx).cargaCifras.create({
      data: {
        categoriaId: datos.categoriaId,
        fuente: datos.fuente,
        nombreArchivo: datos.nombreArchivo ?? null,
        filasOk: datos.filasOk,
        filasError: datos.filasError,
        errores: datos.errores,
        usuarioId: datos.usuarioId ?? null,
      },
    });
  }

  async ejecutarTransaccion<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn, { timeout: 30000 });
  }
}
