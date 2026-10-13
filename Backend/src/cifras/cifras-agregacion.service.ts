import { Injectable } from '@nestjs/common';
import { CifrasRegistrosRepositorio } from './cifras-registros.repositorio';
import { CifrasRepositorio } from './cifras.repositorio';
import { formatoDesdeUnidadCifras, fuenteCifrasDto, tituloCategoriaCifras } from './catalogo-categorias';
import { normalizarClaveCifras, obtenerEsquemaCategoria } from './esquemas/indice';
import {
  ConsultaFiltrosCifrasQueryDto,
  DesgloseCifraDto,
  FuenteCifras,
  IndicadorCifrasDto,
  RespuestaCifrasDto,
  RespuestaFiltrosCifrasDto,
} from './dto/cifras.dto';
import { FiltrosConsultaCifras } from './proveedor-cifras.interface';

type Fila = Record<string, unknown>;

type IndicadorSinFuente = Omit<IndicadorCifrasDto, 'fuente'>;

function aNumero(valor: unknown): number {
  if (typeof valor === 'number') return valor;
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
}

function contarPor(filas: Fila[], clave: string): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const fila of filas) {
    const etiqueta = String(fila[clave] ?? '').trim() || 'Sin dato';
    mapa.set(etiqueta, (mapa.get(etiqueta) ?? 0) + 1);
  }
  return mapa;
}

function sumarPor(filas: Fila[], clave: string, valorClave: string): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const fila of filas) {
    const etiqueta = String(fila[clave] ?? '').trim() || 'Sin dato';
    mapa.set(etiqueta, (mapa.get(etiqueta) ?? 0) + aNumero(fila[valorClave]));
  }
  return mapa;
}

function distintos(filas: Fila[], clave: string): number {
  const valores = new Set<string>();
  for (const fila of filas) {
    const valor = String(fila[clave] ?? '').trim();
    if (valor) valores.add(valor.toLowerCase());
  }
  return valores.size;
}

function desglose(
  mapa: Map<string, number>,
  dimension: string,
  conFacultad = false,
): DesgloseCifraDto[] {
  return Array.from(mapa.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([valorDimension, valor]) => ({
      dimension,
      valorDimension,
      ...(conFacultad ? { facultad: valorDimension } : {}),
      valor,
    }));
}

function indicador(
  clave: string,
  etiqueta: string,
  unidad: string,
  total: number,
  desgloseIndicador: DesgloseCifraDto[] = [],
): IndicadorSinFuente {
  return {
    clave,
    id: clave,
    etiqueta,
    unidad,
    formato: formatoDesdeUnidadCifras(unidad),
    total,
    valor: total,
    desglose: desgloseIndicador,
  };
}

/** Calcula el panel (meta + indicadores + desglose) desde los registros por categoría. */
@Injectable()
export class CifrasAgregacionService {
  constructor(
    private readonly registros: CifrasRegistrosRepositorio,
    private readonly repositorio: CifrasRepositorio,
  ) {}

  esCategoriaDeRegistros(categoriaId: string): boolean {
    return obtenerEsquemaCategoria(categoriaId) !== null;
  }

  /**
   * Devuelve la respuesta agregada de una categoría por registros.
   * `null` cuando la categoría no tiene registros (el proveedor decide el respaldo con semilla).
   * Los periodos disponibles y la fuente se calculan sin aplicar facultad/programa;
   * `meta.sinCoincidencias` marca que hay datos en el periodo pero el filtro deja 0.
   */
  async obtenerCategoria(
    categoriaId: string,
    periodo?: string,
    filtros?: FiltrosConsultaCifras,
  ): Promise<RespuestaCifrasDto | null> {
    const esquema = obtenerEsquemaCategoria(categoriaId);
    if (!esquema) return null;

    const periodosDisponibles = await this.registros.listarPeriodos(categoriaId);
    if (periodosDisponibles.length === 0) return null;

    const periodoEfectivo = periodo ?? periodosDisponibles[0];
    const carga = await this.repositorio.ultimaCarga(categoriaId);
    const fuente = carga ? fuenteCifrasDto(carga.fuente) : FuenteCifras.SEMILLA;

    const { facultadExacta, programaExacto, sedeExacta, sinCoincidencias } =
      await this.resolverFiltros(categoriaId, filtros);

    const filas = sinCoincidencias
      ? []
      : await this.registros.consultar(categoriaId, {
          periodo: periodoEfectivo,
          facultad: facultadExacta,
          programa: programaExacto,
          sede: sedeExacta,
        });

    if (filas.length === 0) {
      return {
        meta: {
          categoriaId,
          titulo: tituloCategoriaCifras(categoriaId),
          periodo: periodoEfectivo ?? '',
          actualizadoEn: (carga?.createdAt ?? new Date()).toISOString(),
          fuente,
          sinCoincidencias: true,
        },
        indicadores: [],
        series: [],
        periodosDisponibles,
      };
    }

    const indicadores: IndicadorCifrasDto[] = this.calcularIndicadores(
      categoriaId,
      filas,
    ).map((indicador) => ({ ...indicador, fuente }));

    return {
      meta: {
        categoriaId,
        titulo: tituloCategoriaCifras(categoriaId),
        periodo: periodoEfectivo ?? '',
        actualizadoEn: (carga?.createdAt ?? new Date()).toISOString(),
        fuente,
      },
      indicadores,
      series: [],
      periodosDisponibles,
    };
  }

  /** Valores reales para los filtros del panel, derivados de los registros persistidos. */
  async obtenerFiltros(
    categoriaId: string,
    consulta: ConsultaFiltrosCifrasQueryDto = {},
  ): Promise<RespuestaFiltrosCifrasDto> {
    const esquema = obtenerEsquemaCategoria(categoriaId);
    if (!esquema) {
      return {
        periodos: await this.repositorio.listarPeriodos(categoriaId),
        facultades: [],
        programas: [],
        sedes: [],
      };
    }

    const periodo = consulta.periodo;
    const facultadSolicitada = consulta.facultad?.trim();
    const facultadExacta = facultadSolicitada
      ? this.coincidir(await this.registros.listarFacultades(categoriaId), facultadSolicitada)
      : undefined;

    const [periodos, facultades, sedes] = await Promise.all([
      this.registros.listarPeriodos(categoriaId),
      this.registros.listarFacultades(categoriaId, periodo),
      this.registros.listarSedes(categoriaId),
    ]);
    const programas =
      facultadSolicitada && !facultadExacta
        ? []
        : await this.registros.listarProgramas(categoriaId, {
            periodo,
            facultad: facultadExacta,
          });

    return { periodos, facultades, programas, sedes };
  }

  /** Compara valores persistidos con el filtro solicitado (trim, sin mayúsculas/tildes). */
  private coincidir(opciones: string[], valor: string): string | undefined {
    const objetivo = normalizarClaveCifras(valor);
    return opciones.find((opcion) => normalizarClaveCifras(opcion) === objetivo);
  }

  private async resolverFiltros(
    categoriaId: string,
    filtros?: FiltrosConsultaCifras,
  ): Promise<{
    facultadExacta?: string;
    programaExacto?: string;
    sedeExacta?: string;
    sinCoincidencias: boolean;
  }> {
    const esquema = obtenerEsquemaCategoria(categoriaId)!;
    const tiene = (claves: string[]) =>
      esquema.columnas.some((columna) => !columna.deprecada && claves.includes(columna.clave));

    let facultadExacta: string | undefined;
    let sinCoincidencias = false;

    const facultadSolicitada = filtros?.facultad?.trim();
    if (facultadSolicitada && tiene(['facultad'])) {
      facultadExacta = this.coincidir(
        await this.registros.listarFacultades(categoriaId),
        facultadSolicitada,
      );
      if (!facultadExacta) sinCoincidencias = true;
    }

    let programaExacto: string | undefined;
    const programaSolicitado = filtros?.programa?.trim();
    if (!sinCoincidencias && programaSolicitado && tiene(['programa', 'programas'])) {
      programaExacto = this.coincidir(
        await this.registros.listarProgramas(categoriaId, { facultad: facultadExacta }),
        programaSolicitado,
      );
      if (!programaExacto) sinCoincidencias = true;
    }

    // Compatibilidad con el filtro heredado por id del catálogo institucional.
    if (
      !sinCoincidencias &&
      !programaExacto &&
      !programaSolicitado &&
      filtros?.programaId &&
      tiene(['programa', 'programas'])
    ) {
      const nombre = await this.registros.resolverNombrePrograma(filtros.programaId);
      if (!nombre) {
        sinCoincidencias = true;
      } else {
        programaExacto = this.coincidir(
          await this.registros.listarProgramas(categoriaId, { facultad: facultadExacta }),
          nombre,
        );
        if (!programaExacto) sinCoincidencias = true;
      }
    }

    let sedeExacta: string | undefined;
    const sedeSolicitada = filtros?.sede?.trim();
    if (!sinCoincidencias && sedeSolicitada && tiene(['sede'])) {
      sedeExacta = this.coincidir(
        await this.registros.listarSedes(categoriaId),
        sedeSolicitada,
      );
      if (!sedeExacta) sinCoincidencias = true;
    }

    return { facultadExacta, programaExacto, sedeExacta, sinCoincidencias };
  }

  private calcularIndicadores(categoriaId: string, filas: Fila[]): IndicadorSinFuente[] {
    switch (categoriaId) {
      case 'estudiantes':
        return this.indicadoresEstudiantes(filas);
      case 'profesores':
        return this.indicadoresProfesores(filas);
      case 'egresados':
        return this.indicadoresEgresados(filas);
      case 'investigacion':
        return this.indicadoresInvestigacion(filas);
      case 'aseguramiento':
        return this.indicadoresAseguramiento(filas);
      case 'infraestructura':
        return this.indicadoresInfraestructura(filas);
      default:
        return [];
    }
  }

  private indicadoresEstudiantes(filas: Fila[]): IndicadorSinFuente[] {
    return [
      indicador('total_matriculados', 'Total matriculados', 'conteo', filas.length),
      indicador(
        'programas_con_matricula',
        'Programas con matrícula',
        'conteo',
        distintos(filas, 'programa'),
      ),
      indicador('por_facultad', 'Matriculados por facultad', 'conteo', filas.length, desglose(contarPor(filas, 'facultad'), 'facultad', true)),
      indicador('por_programa', 'Matriculados por programa', 'conteo', filas.length, desglose(contarPor(filas, 'programa'), 'programa')),
      indicador('por_genero', 'Matriculados por género', 'conteo', filas.length, desglose(contarPor(filas, 'genero'), 'genero')),
      indicador('por_estrato', 'Matriculados por estrato', 'conteo', filas.length, desglose(contarPor(filas, 'estrato'), 'estrato')),
      indicador('por_semestre', 'Matriculados por semestre', 'conteo', filas.length, desglose(contarPor(filas, 'semestre'), 'semestre')),
    ];
  }

  private indicadoresProfesores(filas: Fila[]): IndicadorSinFuente[] {
    const planta = filas.filter((fila) => !fila.periodo_final).length;
    return [
      indicador('total_profesores', 'Total profesores', 'conteo', filas.length),
      indicador('profesores_planta', 'Profesores vigentes (planta)', 'conteo', planta),
      indicador('por_facultad', 'Profesores por facultad', 'conteo', filas.length, desglose(contarPor(filas, 'facultad'), 'facultad', true)),
      indicador('por_programa', 'Profesores por programa', 'conteo', filas.length, desglose(contarPor(filas, 'programa'), 'programa')),
      indicador('por_genero', 'Profesores por género', 'conteo', filas.length, desglose(contarPor(filas, 'genero'), 'genero')),
      indicador('por_estrato', 'Profesores por estrato', 'conteo', filas.length, desglose(contarPor(filas, 'estrato'), 'estrato')),
    ];
  }

  private indicadoresEgresados(filas: Fila[]): IndicadorSinFuente[] {
    return [
      indicador('graduados', 'Graduados', 'conteo', filas.length),
      indicador('por_facultad', 'Graduados por facultad', 'conteo', filas.length, desglose(contarPor(filas, 'facultad'), 'facultad', true)),
      indicador('por_programa', 'Graduados por programa', 'conteo', filas.length, desglose(contarPor(filas, 'programa'), 'programa')),
      indicador('por_genero', 'Graduados por género', 'conteo', filas.length, desglose(contarPor(filas, 'genero'), 'genero')),
      indicador('por_grado', 'Graduados por grado', 'conteo', filas.length, desglose(contarPor(filas, 'grado'), 'grado')),
      indicador('por_nivel', 'Graduados por nivel', 'conteo', filas.length, desglose(contarPor(filas, 'nivel'), 'nivel')),
    ];
  }

  private indicadoresInvestigacion(filas: Fila[]): IndicadorSinFuente[] {
    const totalEstudiantes = filas.reduce(
      (total, fila) => total + aNumero(fila.cantidad_estudiantes),
      0,
    );
    const semilleros = new Set<string>();
    for (const fila of filas) {
      const semillero = String(fila.semillero ?? '').trim();
      if (semillero && semillero.toLowerCase() !== 'sin dato') {
        semilleros.add(semillero.toLowerCase());
      }
    }
    return [
      indicador('semilleros', 'Semilleros de investigación', 'conteo', semilleros.size),
      indicador(
        'grupos_investigacion',
        'Grupos de investigación',
        'conteo',
        distintos(filas, 'grupo_investigacion'),
      ),
      indicador(
        'estudiantes_en_semilleros',
        'Estudiantes en semilleros',
        'conteo',
        totalEstudiantes,
      ),
      indicador('por_facultad', 'Participantes por facultad', 'conteo', totalEstudiantes, desglose(sumarPor(filas, 'facultad', 'cantidad_estudiantes'), 'facultad', true)),
      indicador('por_genero', 'Participantes por género', 'conteo', totalEstudiantes, desglose(sumarPor(filas, 'genero', 'cantidad_estudiantes'), 'genero')),
      indicador('por_programa', 'Participantes por programa', 'conteo', totalEstudiantes, desglose(sumarPor(filas, 'programa', 'cantidad_estudiantes'), 'programa')),
    ];
  }

  private indicadoresAseguramiento(filas: Fila[]): IndicadorSinFuente[] {
    const sumar = (clave: string) =>
      filas.reduce((total, fila) => total + aNumero(fila[clave]), 0);
    const acreditados = sumar('acreditados');
    const acreditables = sumar('acreditables');
    const registros = sumar('registros_calificables');

    const vencimientos = new Map<string, number>();
    for (const fila of filas) {
      const fecha = fila.finalizacion_siac;
      if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) {
        const anio = String(fecha.getUTCFullYear());
        vencimientos.set(anio, (vencimientos.get(anio) ?? 0) + 1);
      }
    }

    return [
      indicador('programas_registrados', 'Programas en el sistema', 'conteo', filas.length),
      indicador('programas_acreditados', 'Programas acreditados', 'conteo', acreditados, desglose(sumarPor(filas, 'facultad', 'acreditados'), 'facultad', true)),
      indicador('programas_acreditables', 'Programas acreditables', 'conteo', acreditables, desglose(sumarPor(filas, 'facultad', 'acreditables'), 'facultad', true)),
      indicador('registros_calificables', 'Registros calificables', 'conteo', registros, desglose(sumarPor(filas, 'facultad', 'registros_calificables'), 'facultad', true)),
      indicador('por_nivel', 'Programas por nivel', 'conteo', filas.length, desglose(contarPor(filas, 'nivel'), 'nivel')),
      indicador(
        'vencimientos_por_anio',
        'Vencimientos por año',
        'conteo',
        filas.length,
        Array.from(vencimientos.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([valorDimension, valor]) => ({ dimension: 'anio', valorDimension, valor })),
      ),
    ];
  }

  private indicadoresInfraestructura(filas: Fila[]): IndicadorSinFuente[] {
    const sumar = (clave: string) =>
      filas.reduce((total, fila) => total + aNumero(fila[clave]), 0);

    const tiposEspacios: Array<[string, string]> = [
      ['Salones de clase', 'cantidad_salones_clase'],
      ['Salas de sistemas', 'cantidad_salas_sistemas'],
      ['Laboratorios', 'cantidad_laboratorios'],
      ['Auditorios', 'cantidad_auditorios'],
      ['Salas de lectura', 'cantidad_salas_lectura'],
      ['Zonas deportivas', 'cantidad_zonas_deportivas'],
      ['Cafeterías', 'cantidad_cafeterias'],
      ['Zonas de estudio', 'cantidad_zonas_estudio'],
      ['Zonas recreativas', 'cantidad_zonas_recreativas'],
    ];
    const areas: Array<[string, string]> = [
      ['Salón de clase', 'area_m2_salon_clase'],
      ['Salas de sistemas', 'area_m2_salas_sistemas'],
      ['Laboratorios', 'area_m2_laboratorios'],
      ['Auditorios', 'area_m2_auditorios'],
      ['Salas de lectura', 'area_m2_salas_lectura'],
      ['Zonas deportivas', 'area_m2_zonas_deportivas'],
    ];

    const totalConstruida = sumar('total_m2_area_construida');
    const totalTerreno = sumar('total_m2_area_terreno');

    return [
      indicador('sedes', 'Sedes registradas', 'conteo', filas.length),
      indicador(
        'total_m2_area_construida',
        'Área construida total',
        'm2',
        totalConstruida,
        desglose(sumarPor(filas, 'sede', 'total_m2_area_construida'), 'sede'),
      ),
      indicador('total_m2_area_terreno', 'Área de terreno total', 'm2', totalTerreno),
      indicador(
        'espacios_por_tipo',
        'Espacios por tipo',
        'conteo',
        tiposEspacios.reduce((total, [, clave]) => total + sumar(clave), 0),
        tiposEspacios.map(([etiqueta, clave]) => ({
          dimension: 'tipo',
          valorDimension: etiqueta,
          valor: sumar(clave),
        })),
      ),
      indicador(
        'area_m2_por_tipo',
        'Área por tipo de espacio',
        'm2',
        areas.reduce((total, [, clave]) => total + sumar(clave), 0),
        areas.map(([etiqueta, clave]) => ({
          dimension: 'tipo',
          valorDimension: etiqueta,
          valor: sumar(clave),
        })),
      ),
      indicador(
        'numero_pisos',
        'Pisos construidos',
        'conteo',
        sumar('numero_pisos'),
        desglose(sumarPor(filas, 'sede', 'numero_pisos'), 'sede'),
      ),
    ];
  }
}
