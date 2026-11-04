import { CategoriaCifras, REGEX_PERIODO_CIFRAS, mensajePeriodoInvalido } from './categorias';

export interface ColumnaEsquemaCifras {
  clave: string;
  tipo: 'texto' | 'entero' | 'decimal' | 'fecha' | 'periodo';
  obligatorio: boolean;
  personal?: boolean;
  descripcion: string;
}

export interface EsquemaCategoriaCifras {
  categoriaId: CategoriaCifras;
  titulo: string;
  claveReemplazo: string;
  columnas: ColumnaEsquemaCifras[];
}

export interface ErrorFilaCifras {
  fila: number;
  columna?: string;
  mensaje: string;
}

type Registro = Record<string, unknown>;

export const ESQUEMAS_CIFRAS: Record<CategoriaCifras, EsquemaCategoriaCifras> = {
  estudiantes: {
    categoriaId: 'estudiantes',
    titulo: 'Estudiantes',
    claveReemplazo: 'periodo_academico',
    columnas: [
      { clave: 'programa', tipo: 'texto', obligatorio: true, descripcion: 'Nombre del programa académico.' },
      { clave: 'genero', tipo: 'texto', obligatorio: true, descripcion: 'Género reportado.' },
      { clave: 'facultad', tipo: 'texto', obligatorio: true, descripcion: 'Facultad del programa.' },
      { clave: 'semestre', tipo: 'entero', obligatorio: true, descripcion: 'Semestre cursado (1 a 12).' },
      { clave: 'estrato', tipo: 'entero', obligatorio: true, descripcion: 'Estrato socioeconómico (1 a 6).' },
      { clave: 'codigo_estudiante', tipo: 'texto', obligatorio: true, descripcion: 'Código institucional del estudiante.' },
      { clave: 'periodo_academico', tipo: 'periodo', obligatorio: true, descripcion: 'Periodo AAAA o AAAA-S.' },
      { clave: 'nombre_estudiante', tipo: 'texto', obligatorio: false, personal: true, descripcion: 'Nombre. Opcional; no se expone a Power BI.' },
    ],
  },
  profesores: {
    categoriaId: 'profesores',
    titulo: 'Profesores',
    claveReemplazo: 'periodo_academico',
    columnas: [
      { clave: 'programa', tipo: 'texto', obligatorio: true, descripcion: 'Programa al que se vincula el docente.' },
      { clave: 'genero', tipo: 'texto', obligatorio: true, descripcion: 'Género reportado.' },
      { clave: 'facultad', tipo: 'texto', obligatorio: true, descripcion: 'Facultad.' },
      { clave: 'periodo_inicio', tipo: 'periodo', obligatorio: true, descripcion: 'Periodo de inicio de la vinculación.' },
      { clave: 'periodo_final', tipo: 'periodo', obligatorio: false, descripcion: 'Periodo de fin, si aplica.' },
      { clave: 'periodo_academico', tipo: 'periodo', obligatorio: true, descripcion: 'Periodo del lote.' },
      { clave: 'estrato', tipo: 'entero', obligatorio: true, descripcion: 'Estrato socioeconómico (1 a 6).' },
      { clave: 'nombre_profesor', tipo: 'texto', obligatorio: false, personal: true, descripcion: 'Nombre. Opcional; no se expone a Power BI.' },
    ],
  },
  egresados: {
    categoriaId: 'egresados',
    titulo: 'Egresados',
    claveReemplazo: 'graduados_periodo',
    columnas: [
      { clave: 'programa', tipo: 'texto', obligatorio: true, descripcion: 'Programa del egresado.' },
      { clave: 'genero', tipo: 'texto', obligatorio: true, descripcion: 'Género reportado.' },
      { clave: 'facultad', tipo: 'texto', obligatorio: true, descripcion: 'Facultad.' },
      { clave: 'graduados_periodo', tipo: 'periodo', obligatorio: true, descripcion: 'Periodo de graduación.' },
      { clave: 'estrato', tipo: 'entero', obligatorio: true, descripcion: 'Estrato socioeconómico (1 a 6).' },
      { clave: 'grado', tipo: 'texto', obligatorio: true, descripcion: 'Título otorgado.' },
      { clave: 'nivel', tipo: 'texto', obligatorio: true, descripcion: 'Nivel de formación.' },
      { clave: 'nombre_egresado', tipo: 'texto', obligatorio: false, personal: true, descripcion: 'Nombre. Opcional; no se expone a Power BI.' },
    ],
  },
  investigacion: {
    categoriaId: 'investigacion',
    titulo: 'Investigación',
    claveReemplazo: 'periodo_academico',
    columnas: [
      { clave: 'facultad', tipo: 'texto', obligatorio: true, descripcion: 'Facultad.' },
      { clave: 'grupo_investigacion', tipo: 'texto', obligatorio: true, descripcion: 'Grupo de investigación.' },
      { clave: 'semillero', tipo: 'texto', obligatorio: true, descripcion: 'Semillero.' },
      { clave: 'periodo_academico', tipo: 'periodo', obligatorio: true, descripcion: 'Periodo del lote.' },
      { clave: 'cantidad_estudiantes', tipo: 'entero', obligatorio: true, descripcion: 'Estudiantes del semillero.' },
      { clave: 'genero', tipo: 'texto', obligatorio: true, descripcion: 'Género reportado en la fila.' },
      { clave: 'programa', tipo: 'texto', obligatorio: true, descripcion: 'Programa.' },
    ],
  },
  aseguramiento: {
    categoriaId: 'aseguramiento',
    titulo: 'Aseguramiento',
    claveReemplazo: 'periodo_academico',
    columnas: [
      { clave: 'periodo_academico', tipo: 'periodo', obligatorio: true, descripcion: 'Periodo del lote.' },
      { clave: 'programas', tipo: 'texto', obligatorio: true, descripcion: 'Nombre del programa.' },
      { clave: 'facultad', tipo: 'texto', obligatorio: true, descripcion: 'Facultad.' },
      { clave: 'grado', tipo: 'texto', obligatorio: true, descripcion: 'Grado del programa.' },
      { clave: 'nivel', tipo: 'texto', obligatorio: true, descripcion: 'Nivel de formación.' },
      { clave: 'acreditados', tipo: 'entero', obligatorio: true, descripcion: 'Programas acreditados (0 o 1 en la fila).' },
      { clave: 'acreditables', tipo: 'entero', obligatorio: true, descripcion: 'Programas acreditables.' },
      { clave: 'registros_calificables', tipo: 'entero', obligatorio: true, descripcion: 'Registros calificados o calificables.' },
      { clave: 'inicio_siac', tipo: 'fecha', obligatorio: true, descripcion: 'Fecha de inicio del trámite SIAC (ISO 8601).' },
      { clave: 'finalizacion_siac', tipo: 'fecha', obligatorio: true, descripcion: 'Fecha de finalización (ISO 8601).' },
      { clave: 'snies', tipo: 'texto', obligatorio: true, descripcion: 'Código SNIES.' },
    ],
  },
  infraestructura: {
    categoriaId: 'infraestructura',
    titulo: 'Infraestructura',
    claveReemplazo: 'sede',
    columnas: [
      { clave: 'sede', tipo: 'texto', obligatorio: true, descripcion: 'Nombre de la sede. Clave de reemplazo del lote.' },
      { clave: 'direccion', tipo: 'texto', obligatorio: true, descripcion: 'Dirección de la sede.' },
      { clave: 'numero_pisos', tipo: 'entero', obligatorio: true, descripcion: 'Número de pisos.' },
      { clave: 'estado', tipo: 'texto', obligatorio: true, descripcion: 'Estado de la sede.' },
      { clave: 'total_m2_area_construida', tipo: 'decimal', obligatorio: true, descripcion: 'Área construida en m².' },
      { clave: 'total_m2_area_terreno', tipo: 'decimal', obligatorio: true, descripcion: 'Área de terreno en m².' },
      { clave: 'cantidad_salones_clase', tipo: 'entero', obligatorio: true, descripcion: 'Salones de clase.' },
      { clave: 'area_m2_salon_clase', tipo: 'decimal', obligatorio: true, descripcion: 'Área de salones en m².' },
      { clave: 'cantidad_salas_sistemas', tipo: 'entero', obligatorio: true, descripcion: 'Salas de sistemas.' },
      { clave: 'area_m2_salas_sistemas', tipo: 'decimal', obligatorio: true, descripcion: 'Área de salas de sistemas en m².' },
      { clave: 'cantidad_laboratorios', tipo: 'entero', obligatorio: true, descripcion: 'Laboratorios.' },
      { clave: 'area_m2_laboratorios', tipo: 'decimal', obligatorio: true, descripcion: 'Área de laboratorios en m².' },
      { clave: 'cantidad_auditorios', tipo: 'entero', obligatorio: true, descripcion: 'Auditorios.' },
      { clave: 'area_m2_auditorios', tipo: 'decimal', obligatorio: true, descripcion: 'Área de auditorios en m².' },
      { clave: 'cantidad_salas_lectura', tipo: 'entero', obligatorio: true, descripcion: 'Salas de lectura.' },
      { clave: 'area_m2_salas_lectura', tipo: 'decimal', obligatorio: true, descripcion: 'Área de salas de lectura en m².' },
      { clave: 'cantidad_zonas_deportivas', tipo: 'entero', obligatorio: true, descripcion: 'Zonas deportivas.' },
      { clave: 'area_m2_zonas_deportivas', tipo: 'decimal', obligatorio: true, descripcion: 'Área de zonas deportivas en m².' },
      { clave: 'cantidad_cafeterias', tipo: 'entero', obligatorio: true, descripcion: 'Cafeterías.' },
      { clave: 'cantidad_zonas_estudio', tipo: 'entero', obligatorio: true, descripcion: 'Zonas de estudio.' },
      { clave: 'cantidad_zonas_recreativas', tipo: 'entero', obligatorio: true, descripcion: 'Zonas recreativas.' },
    ],
  },
  bienestar: {
    categoriaId: 'bienestar',
    titulo: 'Bienestar',
    claveReemplazo: 'periodo',
    columnas: [
      { clave: 'clave', tipo: 'texto', obligatorio: true, descripcion: 'Identificador de la variable.' },
      { clave: 'periodo', tipo: 'periodo', obligatorio: true, descripcion: 'Periodo del lote.' },
      { clave: 'facultad', tipo: 'texto', obligatorio: true, descripcion: 'Facultad.' },
      { clave: 'dimension', tipo: 'texto', obligatorio: true, descripcion: 'Dimensión de desglose.' },
      { clave: 'valor_dimension', tipo: 'texto', obligatorio: true, descripcion: 'Valor de la dimensión.' },
      { clave: 'valor', tipo: 'decimal', obligatorio: true, descripcion: 'Conteo o porcentaje (0–100 con un decimal).' },
    ],
  },
  'relaciones-entorno': {
    categoriaId: 'relaciones-entorno',
    titulo: 'Relaciones con el entorno',
    claveReemplazo: 'periodo',
    columnas: [
      { clave: 'clave', tipo: 'texto', obligatorio: true, descripcion: 'Identificador de la variable.' },
      { clave: 'periodo', tipo: 'periodo', obligatorio: true, descripcion: 'Periodo del lote.' },
      { clave: 'facultad', tipo: 'texto', obligatorio: true, descripcion: 'Facultad.' },
      { clave: 'dimension', tipo: 'texto', obligatorio: true, descripcion: 'Dimensión de desglose.' },
      { clave: 'valor_dimension', tipo: 'texto', obligatorio: true, descripcion: 'Valor de la dimensión.' },
      { clave: 'valor', tipo: 'decimal', obligatorio: true, descripcion: 'Conteo o porcentaje.' },
    ],
  },
};

const ALIAS_CAMEL: Record<string, string> = {
  codigo_estudiante: 'codigoEstudiante',
  nombre_estudiante: 'nombreEstudiante',
  periodo_academico: 'periodoAcademico',
  periodo_inicio: 'periodoInicio',
  periodo_final: 'periodoFinal',
  nombre_profesor: 'nombreProfesor',
  graduados_periodo: 'graduadosPeriodo',
  nombre_egresado: 'nombreEgresado',
  grupo_investigacion: 'grupoInvestigacion',
  cantidad_estudiantes: 'cantidadEstudiantes',
  registros_calificables: 'registrosCalificables',
  inicio_siac: 'inicioSiac',
  finalizacion_siac: 'finalizacionSiac',
  numero_pisos: 'numeroPisos',
  total_m2_area_construida: 'totalM2AreaConstruida',
  total_m2_area_terreno: 'totalM2AreaTerreno',
  cantidad_salones_clase: 'cantidadSalonesClase',
  area_m2_salon_clase: 'areaM2SalonClase',
  cantidad_salas_sistemas: 'cantidadSalasSistemas',
  area_m2_salas_sistemas: 'areaM2SalasSistemas',
  cantidad_laboratorios: 'cantidadLaboratorios',
  area_m2_laboratorios: 'areaM2Laboratorios',
  cantidad_auditorios: 'cantidadAuditorios',
  area_m2_auditorios: 'areaM2Auditorios',
  cantidad_salas_lectura: 'cantidadSalasLectura',
  area_m2_salas_lectura: 'areaM2SalasLectura',
  cantidad_zonas_deportivas: 'cantidadZonasDeportivas',
  area_m2_zonas_deportivas: 'areaM2ZonasDeportivas',
  cantidad_cafeterias: 'cantidadCafeterias',
  cantidad_zonas_estudio: 'cantidadZonasEstudio',
  cantidad_zonas_recreativas: 'cantidadZonasRecreativas',
  valor_dimension: 'valorDimension',
};

export function leerCampo(registro: Registro, clave: string): unknown {
  if (registro[clave] !== undefined) return registro[clave];
  const camel = ALIAS_CAMEL[clave];
  if (camel && registro[camel] !== undefined) return registro[camel];
  return undefined;
}

function esVacio(valor: unknown): boolean {
  return valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '');
}

function comoTexto(valor: unknown): string | null {
  if (typeof valor !== 'string' && typeof valor !== 'number') return null;
  const texto = String(valor).trim();
  return texto.length > 0 ? texto : null;
}

function comoEntero(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isInteger(valor)) return valor;
  if (typeof valor === 'string' && /^-?\d+$/.test(valor.trim())) return Number(valor.trim());
  return null;
}

function comoDecimal(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (typeof valor === 'string' && /^-?\d+(\.\d+)?$/.test(valor.trim())) return Number(valor.trim());
  return null;
}

function esPeriodo(valor: string): boolean {
  return REGEX_PERIODO_CIFRAS.test(valor);
}

function esFechaIso(valor: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(T|$)/.test(valor) && !Number.isNaN(Date.parse(valor));
}

function validarValor(
  columna: ColumnaEsquemaCifras,
  crudo: unknown,
  fila: number,
): ErrorFilaCifras | null {
  if (esVacio(crudo)) {
    if (!columna.obligatorio) return null;
    return { fila, columna: columna.clave, mensaje: `La columna ${columna.clave} es obligatoria.` };
  }
  if (columna.tipo === 'texto') {
    if (!comoTexto(crudo)) {
      return { fila, columna: columna.clave, mensaje: `La columna ${columna.clave} debe ser texto.` };
    }
    return null;
  }
  if (columna.tipo === 'periodo') {
    const texto = comoTexto(crudo);
    if (!texto || !esPeriodo(texto)) {
      return { fila, columna: columna.clave, mensaje: mensajePeriodoInvalido() };
    }
    return null;
  }
  if (columna.tipo === 'fecha') {
    const texto = comoTexto(crudo);
    if (!texto || !esFechaIso(texto)) {
      return {
        fila,
        columna: columna.clave,
        mensaje: `La columna ${columna.clave} debe ser una fecha ISO 8601 (ej. 2026-03-15).`,
      };
    }
    return null;
  }
  if (columna.tipo === 'entero') {
    const entero = comoEntero(crudo);
    if (entero === null) {
      return { fila, columna: columna.clave, mensaje: `La columna ${columna.clave} debe ser un entero.` };
    }
    if (columna.clave === 'semestre' && (entero < 1 || entero > 12)) {
      return { fila, columna: columna.clave, mensaje: 'El semestre debe estar entre 1 y 12.' };
    }
    if (columna.clave === 'estrato' && (entero < 1 || entero > 6)) {
      return { fila, columna: columna.clave, mensaje: 'El estrato debe estar entre 1 y 6.' };
    }
    if (entero < 0) {
      return { fila, columna: columna.clave, mensaje: `La columna ${columna.clave} no puede ser negativa.` };
    }
    return null;
  }
  const decimal = comoDecimal(crudo);
  if (decimal === null) {
    return { fila, columna: columna.clave, mensaje: `La columna ${columna.clave} debe ser un número.` };
  }
  if (decimal < 0) {
    return { fila, columna: columna.clave, mensaje: `La columna ${columna.clave} no puede ser negativa.` };
  }
  return null;
}

export function validarLoteCifras(
  categoria: CategoriaCifras,
  registros: unknown[],
  periodoLote?: string,
): ErrorFilaCifras[] {
  const esquema = ESQUEMAS_CIFRAS[categoria];
  const errores: ErrorFilaCifras[] = [];
  if (periodoLote !== undefined && !esPeriodo(periodoLote)) {
    errores.push({ fila: 0, columna: 'periodo', mensaje: mensajePeriodoInvalido() });
  }
  registros.forEach((item, indice) => {
    const fila = indice + 1;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errores.push({ fila, mensaje: 'Cada registro debe ser un objeto JSON.' });
      return;
    }
    const registro = item as Registro;
    for (const columna of esquema.columnas) {
      let valor = leerCampo(registro, columna.clave);
      if (
        esVacio(valor) &&
        columna.tipo === 'periodo' &&
        periodoLote &&
        (columna.clave === 'periodo_academico' ||
          columna.clave === 'periodo' ||
          columna.clave === 'graduados_periodo')
      ) {
        valor = periodoLote;
      }
      const error = validarValor(columna, valor, fila);
      if (error) errores.push(error);
      else if (
        columna.tipo === 'periodo' &&
        periodoLote &&
        (columna.clave === 'periodo_academico' ||
          columna.clave === 'periodo' ||
          columna.clave === 'graduados_periodo')
      ) {
        const texto = comoTexto(valor);
        if (texto && texto !== periodoLote) {
          errores.push({
            fila,
            columna: columna.clave,
            mensaje: `El ${columna.clave} de la fila debe coincidir con el periodo del lote (${periodoLote}).`,
          });
        }
      }
    }
  });
  return errores;
}

export function textoObligatorio(registro: Registro, clave: string, respaldo?: string): string {
  return comoTexto(leerCampo(registro, clave)) ?? respaldo ?? '';
}

export function textoOpcional(registro: Registro, clave: string): string | null {
  return comoTexto(leerCampo(registro, clave));
}

export function enteroObligatorio(registro: Registro, clave: string): number {
  return comoEntero(leerCampo(registro, clave)) ?? 0;
}

export function decimalObligatorio(registro: Registro, clave: string): number {
  return comoDecimal(leerCampo(registro, clave)) ?? 0;
}

export function fechaObligatoria(registro: Registro, clave: string): Date {
  return new Date(comoTexto(leerCampo(registro, clave)) ?? '');
}
