import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { esCategoriaCifrasValida } from './catalogo-categorias';
import { CifrasRegistrosRepositorio } from './cifras-registros.repositorio';
import { FiltrosFeedCifrasQueryDto, RespuestaFeedCifrasDto } from './dto/cifras.dto';

const TAMANO_MAXIMO = 5000;

function aValorJson(valor: unknown): unknown {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return valor.toISOString();
  if (valor instanceof Prisma.Decimal) return Number(valor);
  if (typeof valor === 'object') return String(valor);
  return valor;
}

function aRegistroJson(fila: Record<string, unknown>): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(fila)) {
    salida[clave] = aValorJson(valor);
  }
  return salida;
}

/**
 * Feed plano para Power BI (S3-03): sin datos personales, paginado y con total.
 */
@Injectable()
export class CifrasFeedService {
  constructor(
    private readonly registros: CifrasRegistrosRepositorio,
    private readonly prisma: PrismaService,
  ) {}

  async obtenerDatos(
    categoriaId: string,
    filtros: FiltrosFeedCifrasQueryDto,
  ): Promise<RespuestaFeedCifrasDto> {
    if (!esCategoriaCifrasValida(categoriaId)) {
      throw new NotFoundException(`La categoría «${categoriaId}» no existe.`);
    }

    const pagina = Math.max(filtros.pagina ?? 1, 1);
    const tamano = Math.min(Math.max(filtros.tamano ?? 1000, 1), TAMANO_MAXIMO);
    const skip = (pagina - 1) * tamano;

    if (this.registros.esCategoriaRegistros(categoriaId)) {
      const filtrosRepo = { periodo: filtros.periodo, sede: filtros.sede };
      const totalRegistros = await this.registros.contar(categoriaId, filtrosRepo);
      const filas = await this.registros.consultar(categoriaId, filtrosRepo, { skip, take: tamano });
      return {
        categoriaId,
        periodo: filtros.periodo ?? null,
        pagina,
        tamano,
        totalRegistros,
        registros: filas.map(aRegistroJson),
      };
    }

    const where: Prisma.CifraIndicadorWhereInput = {
      categoriaId,
      ...(filtros.periodo ? { periodo: filtros.periodo } : {}),
      ...(filtros.sede ? { sede: filtros.sede } : {}),
    };
    const [totalRegistros, filas] = await Promise.all([
      this.prisma.cifraIndicador.count({ where }),
      this.prisma.cifraIndicador.findMany({
        where,
        include: { variable: true },
        orderBy: { id: 'asc' },
        skip,
        take: tamano,
      }),
    ]);

    return {
      categoriaId,
      periodo: filtros.periodo ?? null,
      pagina,
      tamano,
      totalRegistros,
      registros: filas.map((fila) => ({
        clave: fila.variable.clave,
        etiqueta: fila.variable.etiquetaCuac,
        unidad: fila.variable.unidad,
        periodo: fila.periodo,
        facultad: fila.facultad,
        sede: fila.sede,
        dimension: fila.dimension,
        valor_dimension: fila.valorDimension,
        valor: Number(fila.valor),
        fuente: fila.fuente,
      })),
    };
  }
}
