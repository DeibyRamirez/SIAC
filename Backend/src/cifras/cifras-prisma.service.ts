import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CATEGORIAS_CIFRAS,
  esCategoriaCifrasValida,
  fuenteCifrasDto,
  tituloCategoriaCifras,
} from './catalogo-categorias';
import { CifrasRepositorio, CifraConVariable } from './cifras.repositorio';
import { CifrasSemillaService } from './cifras-semilla.service';
import {
  CategoriaCifrasDto,
  DesgloseCifraDto,
  FormatoIndicador,
  FuenteCifras,
  IndicadorCifrasDto,
  RespuestaCifrasDto,
  SerieCifrasDto,
  TipoSerieCifras,
} from './dto/cifras.dto';
import { FiltrosConsultaCifras, ProveedorCifras } from './proveedor-cifras.interface';

interface GrupoVariable {
  variable: CifraConVariable['variable'];
  filas: CifraConVariable[];
}

@Injectable()
export class CifrasPrismaService implements ProveedorCifras {
  constructor(
    private readonly repositorio: CifrasRepositorio,
    private readonly semilla: CifrasSemillaService,
  ) {}

  async listarCategorias(): Promise<CategoriaCifrasDto[]> {
    const variables = await this.repositorio.listarVariables();

    return CATEGORIAS_CIFRAS.map((categoria) => {
      const propias = variables.filter(
        (variable) => variable.categoriaId === categoria.id && variable.activo,
      );

      return {
        ...categoria,
        disponible: propias.length > 0 || this.semilla.tieneDatos(categoria.id),
        variables: propias.map((variable) => ({
          clave: variable.clave,
          etiquetaCuac: variable.etiquetaCuac,
          descripcion: variable.descripcion ?? undefined,
          unidad: variable.unidad,
          dimensiones: variable.dimensiones,
        })),
      };
    });
  }

  async obtenerPorCategoria(
    categoriaId: string,
    periodo?: string,
    filtros?: FiltrosConsultaCifras,
  ): Promise<RespuestaCifrasDto> {
    if (!esCategoriaCifrasValida(categoriaId)) {
      throw new NotFoundException(`La categoría «${categoriaId}» no existe.`);
    }

    const periodosDisponibles = await this.repositorio.listarPeriodos(categoriaId, filtros);

    if (periodosDisponibles.length === 0) {
      return this.respuestaSemilla(categoriaId, periodo);
    }

    const periodoEfectivo = periodo ?? periodosDisponibles[0];
    const filas = await this.repositorio.consultarIndicadores({
      categoriaId,
      variable: { activo: true },
      periodo: periodoEfectivo,
      ...(filtros?.facultad ? { facultad: filtros.facultad } : {}),
      ...(filtros?.programaId ? { programaId: filtros.programaId } : {}),
      ...(filtros?.sede ? { sede: filtros.sede } : {}),
    });

    if (filas.length === 0) {
      return this.respuestaSemilla(categoriaId, periodo);
    }

    return this.construirRespuesta(categoriaId, periodoEfectivo, filas, periodosDisponibles);
  }

  private construirRespuesta(
    categoriaId: string,
    periodo: string,
    filas: CifraConVariable[],
    periodosDisponibles: string[],
  ): RespuestaCifrasDto {
    const grupos = new Map<string, GrupoVariable>();
    for (const fila of filas) {
      const grupo = grupos.get(fila.variableId);
      if (grupo) {
        grupo.filas.push(fila);
      } else {
        grupos.set(fila.variableId, { variable: fila.variable, filas: [fila] });
      }
    }

    const indicadores: IndicadorCifrasDto[] = [];
    const series: SerieCifrasDto[] = [];

    for (const grupo of grupos.values()) {
      const { variable, filas: filasVariable } = grupo;

      const filasTotales = filasVariable.filter(
        (fila) => !fila.dimension && !fila.valorDimension && !fila.facultad && !fila.programaId && !fila.sede,
      );
      const filasBase = filasTotales.length > 0 ? filasTotales : filasVariable;
      const total = filasBase.reduce((suma, fila) => suma + Number(fila.valor), 0);

      const desglose: DesgloseCifraDto[] = filasVariable
        .filter(
          (fila) => fila.dimension || fila.valorDimension || fila.facultad || fila.programaId || fila.sede,
        )
        .map((fila) => ({
          dimension: fila.dimension ?? (fila.facultad ? 'facultad' : undefined),
          valorDimension: fila.valorDimension ?? fila.facultad ?? undefined,
          facultad: fila.facultad ?? undefined,
          valor: Number(fila.valor),
        }));

      indicadores.push({
        clave: variable.clave,
        id: variable.clave,
        etiqueta: variable.etiquetaCuac,
        unidad: variable.unidad,
        formato: this.formatoDesdeUnidad(variable.unidad),
        total,
        valor: total,
        fuente: this.resolverFuente(filasVariable),
        desglose,
      });

      const puntos = new Map<string, number>();
      for (const fila of filasVariable) {
        const etiqueta = fila.valorDimension ?? fila.facultad;
        if (!etiqueta) {
          continue;
        }
        puntos.set(etiqueta, (puntos.get(etiqueta) ?? 0) + Number(fila.valor));
      }
      if (puntos.size > 0) {
        series.push({
          id: variable.clave,
          tipo: TipoSerieCifras.barra,
          titulo: variable.etiquetaCuac,
          subtitulo: `Periodo ${periodo}`,
          puntos: Array.from(puntos.entries()).map(([etiqueta, valor]) => ({ etiqueta, valor })),
        });
      }
    }

    const masReciente = filas.reduce((anterior, actual) =>
      anterior.updatedAt > actual.updatedAt ? anterior : actual,
    );

    return {
      meta: {
        categoriaId,
        titulo: tituloCategoriaCifras(categoriaId),
        periodo,
        actualizadoEn: masReciente.updatedAt.toISOString(),
        fuente: this.resolverFuente(filas),
      },
      indicadores,
      series,
      periodosDisponibles,
    };
  }

  /** Fuente única del conjunto; si conviven varias, «MIXTA». */
  private resolverFuente(filas: CifraConVariable[]): FuenteCifras {
    const fuentes = new Set(filas.map((fila) => fila.fuente));
    if (fuentes.size === 1) {
      return fuenteCifrasDto(filas[0].fuente);
    }
    return FuenteCifras.MIXTA;
  }

  private async respuestaSemilla(
    categoriaId: string,
    periodo?: string,
  ): Promise<RespuestaCifrasDto> {
    try {
      const datos = await this.semilla.obtenerPorCategoria(categoriaId, periodo);
      return {
        ...datos,
        meta: { ...datos.meta, fuente: FuenteCifras.SEMILLA },
        indicadores: datos.indicadores.map((indicador) => ({
          ...indicador,
          clave: indicador.clave ?? indicador.id ?? '',
          total: indicador.total ?? Number(indicador.valor ?? 0),
          fuente: FuenteCifras.SEMILLA,
          desglose: indicador.desglose ?? [],
        })),
        series: datos.series ?? [],
        periodosDisponibles: datos.periodosDisponibles ?? datos.filtrosDisponibles?.periodos ?? [],
      };
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
      return {
        meta: {
          categoriaId,
          titulo: tituloCategoriaCifras(categoriaId),
          periodo: periodo ?? '',
          actualizadoEn: new Date().toISOString(),
          fuente: FuenteCifras.SEMILLA,
        },
        indicadores: [],
        series: [],
        periodosDisponibles: [],
      };
    }
  }

  private formatoDesdeUnidad(unidad: string): FormatoIndicador {
    switch (unidad) {
      case 'porcentaje':
        return FormatoIndicador.porcentaje;
      case 'm2':
        return FormatoIndicador.decimal;
      default:
        return FormatoIndicador.entero;
    }
  }
}
