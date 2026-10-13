import {
  ColumnaEsquemaCifras,
  columnasPersistidas,
  EsquemaCategoriaCifras,
} from './tipos';

export interface ErrorValidacionCifras {
  fila: number;
  columna: string;
  mensaje: string;
}

export interface FilaCrudaCifras {
  numero: number;
  /** Valor crudo de la celda (ExcelJS) indexado por clave de columna. */
  celdas: Map<string, unknown>;
}

export interface ResultadoValidacionFila {
  datos?: Record<string, unknown>;
  errores: ErrorValidacionCifras[];
}

function aTextoCrudo(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor).trim();
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === 'object') {
    const objeto = valor as {
      text?: unknown;
      result?: unknown;
      richText?: Array<{ text: string }>;
    };
    if (typeof objeto.text === 'string') return objeto.text.trim();
    if (Array.isArray(objeto.richText)) {
      return objeto.richText.map((fragmento) => fragmento.text).join('').trim();
    }
    if (objeto.result !== undefined && objeto.result !== null) return aTextoCrudo(objeto.result);
  }
  return String(valor).trim();
}

function numeroCrudo(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor === 'string') {
    const texto = valor.trim().replace(/\s/g, '').replace(',', '.');
    if (!texto) return null;
    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : null;
  }
  if (valor && typeof valor === 'object') {
    const objeto = valor as { result?: unknown; text?: unknown };
    if (objeto.result !== undefined) return numeroCrudo(objeto.result);
    if (objeto.text !== undefined) return numeroCrudo(objeto.text);
  }
  return null;
}

/** Número de Excel (serie) a fecha UTC. */
function fechaDesdeSerieExcel(serie: number): Date {
  const milisegundos = Math.round((serie - 25569) * 86400 * 1000);
  return new Date(milisegundos);
}

function fechaCruda(valor: unknown): Date | null {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    const fecha = fechaDesdeSerieExcel(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }
  const texto = aTextoCrudo(valor).replace(/^"|"$/g, '');
  if (!texto) return null;
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(texto);
  const fecha = new Date(soloFecha ? `${texto}T00:00:00.000Z` : texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function mensajeRango(columna: ColumnaEsquemaCifras): string {
  if (columna.min !== undefined && columna.max !== undefined) {
    return `debe ser un entero entre ${columna.min} y ${columna.max}`;
  }
  if (columna.min !== undefined) return `debe ser un entero mayor o igual a ${columna.min}`;
  if (columna.max !== undefined) return `debe ser un entero menor o igual a ${columna.max}`;
  return 'debe ser un entero';
}

function validarColumna(
  columna: ColumnaEsquemaCifras,
  valor: unknown,
): { valor?: unknown; error?: string } {
  if (columna.deprecada) return {};

  const texto = aTextoCrudo(valor);
  if (!texto) {
    return columna.obligatoria ? { error: 'es obligatoria' } : {};
  }

  switch (columna.tipo) {
    case 'texto':
      return { valor: texto };

    case 'periodo': {
      if (!/^\d{4}-[12]$/.test(texto)) {
        return { error: 'debe tener formato AAAA-S (ej. 2023-2)' };
      }
      return { valor: texto };
    }

    case 'codigo': {
      if (typeof valor === 'number' && Number.isFinite(valor)) {
        return { valor: Number.isInteger(valor) ? valor.toFixed(0) : String(valor) };
      }
      return { valor: texto };
    }

    case 'fecha': {
      const fecha = fechaCruda(valor);
      if (!fecha) return { error: 'debe ser una fecha válida (AAAA-MM-DD)' };
      return { valor: fecha };
    }

    case 'entero': {
      const numero = numeroCrudo(valor);
      if (numero === null || !Number.isInteger(numero)) {
        return { error: mensajeRango(columna) };
      }
      if (columna.min !== undefined && numero < columna.min) {
        return { error: mensajeRango(columna) };
      }
      if (columna.max !== undefined && numero > columna.max) {
        return { error: mensajeRango(columna) };
      }
      return { valor: numero };
    }

    case 'decimal': {
      const numero = numeroCrudo(valor);
      if (numero === null) return { error: 'debe ser un número' };
      if (columna.min !== undefined && numero < columna.min) {
        return { error: `debe ser un número mayor o igual a ${columna.min}` };
      }
      return { valor: Math.round(numero * 100) / 100 };
    }

    case 'enum': {
      const permitidos = columna.enum ?? [];
      if (!permitidos.includes(texto)) {
        return { error: `debe ser uno de: ${permitidos.join(', ')}` };
      }
      return { valor: texto };
    }

    default:
      return { error: 'tipo de columna no soportado' };
  }
}

/** Valida una fila completa; no lanza excepciones y devuelve errores por columna. */
export function validarFilaCifras(
  esquema: EsquemaCategoriaCifras,
  fila: FilaCrudaCifras,
): ResultadoValidacionFila {
  const errores: ErrorValidacionCifras[] = [];
  const datos: Record<string, unknown> = {};

  for (const columna of columnasPersistidas(esquema)) {
    const resultado = validarColumna(columna, fila.celdas.get(columna.clave));
    if (resultado.error) {
      errores.push({ fila: fila.numero, columna: columna.encabezado, mensaje: resultado.error });
      continue;
    }
    if (resultado.valor !== undefined) {
      datos[columna.clave] = resultado.valor;
    }
  }

  // Banderas excluyentes: exactamente una debe ser 1.
  const banderas = esquema.columnas.filter(
    (columna) => columna.bandera && !columna.deprecada,
  );
  if (banderas.length > 0 && errores.length === 0) {
    const suma = banderas.reduce((total, columna) => total + Number(datos[columna.clave] ?? 0), 0);
    if (suma !== 1) {
      errores.push({
        fila: fila.numero,
        columna: banderas[0].encabezado,
        mensaje: `${banderas.map((columna) => columna.encabezado).join(' + ')} debe sumar 1 en la fila`,
      });
    }
  }

  // finalizacion >= inicio cuando el esquema trae ambas columnas de fecha.
  const columnaInicio = esquema.columnas.find((columna) => columna.clave === 'inicio_siac');
  const columnaFinal = esquema.columnas.find(
    (columna) => columna.clave === 'finalizacion_siac',
  );
  if (
    errores.length === 0 &&
    columnaInicio &&
    columnaFinal &&
    datos[columnaInicio.clave] instanceof Date &&
    datos[columnaFinal.clave] instanceof Date
  ) {
    const inicio = datos[columnaInicio.clave] as Date;
    const final = datos[columnaFinal.clave] as Date;
    if (final.getTime() < inicio.getTime()) {
      errores.push({
        fila: fila.numero,
        columna: columnaFinal.encabezado,
        mensaje: `debe ser mayor o igual que «${columnaInicio.encabezado}»`,
      });
    }
  }

  if (errores.length > 0) return { errores };
  return { datos, errores };
}
