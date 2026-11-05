import { normalizarClaveCifras } from './normalizacion';
import { esPeriodoValido } from './periodo';
import {
  ColumnaEsquemaCifras,
  columnasPersistidas,
  EsquemaCategoriaCifras,
} from './tipos';

export const LIMITE_LOTE_CIFRAS = 5000;

export interface ErrorValidacionCifra {
  fila: number;
  columna: string;
  mensaje: string;
}

export interface FilaValidadaCifra {
  fila: number;
  ambito: string;
  datos: Record<string, unknown>;
}

export interface ResultadoValidacionLote {
  filasOk: number;
  filasError: number;
  errores: ErrorValidacionCifra[];
  filas: FilaValidadaCifra[];
}

function esObjetoPlano(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function aTextoCrudo(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor).trim();
  if (valor instanceof Date) return valor.toISOString();
  return '';
}

function numeroCrudo(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor === 'string') {
    const texto = valor.trim().replace(/\s/g, '').replace(',', '.');
    if (!texto) return null;
    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : null;
  }
  return null;
}

function fechaCruda(valor: unknown): Date | null {
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  const texto = aTextoCrudo(valor);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const fecha = new Date(`${texto}T00:00:00.000Z`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function mapaColumnas(esquema: EsquemaCategoriaCifras): Map<string, ColumnaEsquemaCifras> {
  const mapa = new Map<string, ColumnaEsquemaCifras>();
  for (const columna of esquema.columnas) {
    mapa.set(columna.clave, columna);
    mapa.set(normalizarClaveCifras(columna.encabezado), columna);
    for (const alias of columna.alias ?? []) {
      mapa.set(normalizarClaveCifras(alias), columna);
    }
  }
  return mapa;
}

function mensajeRango(columna: ColumnaEsquemaCifras): string {
  if (columna.min !== undefined && columna.max !== undefined) {
    return `La columna ${columna.clave} debe ser un entero entre ${columna.min} y ${columna.max}.`;
  }
  if (columna.min !== undefined) {
    return `La columna ${columna.clave} debe ser un entero mayor o igual a ${columna.min}.`;
  }
  return `La columna ${columna.clave} debe ser un entero.`;
}

function validarColumna(
  columna: ColumnaEsquemaCifras,
  valor: unknown,
): { valor?: unknown; ausente?: boolean; error?: string } {
  const texto = aTextoCrudo(valor);
  if (!texto) {
    return columna.obligatoria
      ? { error: `La columna ${columna.clave} es obligatoria.` }
      : { ausente: true };
  }

  switch (columna.tipo) {
    case 'texto': {
      if (columna.maxCaracteres && texto.length > columna.maxCaracteres) {
        return {
          error: `La columna ${columna.clave} admite como máximo ${columna.maxCaracteres} caracteres.`,
        };
      }
      return { valor: texto };
    }
    case 'periodo': {
      if (!esPeriodoValido(texto)) {
        return {
          error: `La columna ${columna.clave} debe tener formato AAAA o AAAA-S (ejemplo 2026-1).`,
        };
      }
      return { valor: texto };
    }
    case 'codigo': {
      const codigo =
        typeof valor === 'number' && Number.isInteger(valor) ? String(valor) : texto;
      if (columna.maxCaracteres && codigo.length > columna.maxCaracteres) {
        return {
          error: `La columna ${columna.clave} admite como máximo ${columna.maxCaracteres} caracteres.`,
        };
      }
      return { valor: codigo };
    }
    case 'fecha': {
      const fecha = fechaCruda(valor);
      if (!fecha) {
        return { error: `La columna ${columna.clave} debe ser una fecha AAAA-MM-DD.` };
      }
      return { valor: fecha };
    }
    case 'entero': {
      const numero = numeroCrudo(valor);
      if (numero === null || !Number.isInteger(numero)) return { error: mensajeRango(columna) };
      if (columna.min !== undefined && numero < columna.min) return { error: mensajeRango(columna) };
      if (columna.max !== undefined && numero > columna.max) return { error: mensajeRango(columna) };
      return { valor: numero };
    }
    case 'decimal': {
      const numero = numeroCrudo(valor);
      if (numero === null) return { error: `La columna ${columna.clave} debe ser un número.` };
      if (columna.min !== undefined && numero < columna.min) {
        return {
          error: `La columna ${columna.clave} debe ser un número mayor o igual a ${columna.min}.`,
        };
      }
      return { valor: Math.round(numero * 100) / 100 };
    }
    case 'enum': {
      const permitidos = columna.enum ?? [];
      if (!permitidos.includes(texto)) {
        return {
          error: `La columna ${columna.clave} debe ser uno de: ${permitidos.join(', ')}.`,
        };
      }
      return { valor: texto };
    }
    default:
      return { error: `La columna ${columna.clave} tiene un tipo no soportado.` };
  }
}

function resumir(total: number, errores: ErrorValidacionCifra[]) {
  const filasConError = new Set(errores.map((error) => error.fila));
  const filasError = filasConError.size;
  return { filasOk: total - filasError, filasError };
}

function completarPeriodo(
  esquema: EsquemaCategoriaCifras,
  registro: Record<string, unknown>,
  periodoLote: string | undefined,
): Record<string, unknown> {
  if (!periodoLote || esquema.claveReemplazo === 'sede') return registro;
  const mapa = mapaColumnas(esquema);
  const clave = esquema.claveReemplazo;
  const copia: Record<string, unknown> = { ...registro };
  let presente = false;
  for (const llave of Object.keys(copia)) {
    if (mapa.get(normalizarClaveCifras(llave))?.clave !== clave) continue;
    if (aTextoCrudo(copia[llave])) presente = true;
    else delete copia[llave];
  }
  if (!presente) copia[clave] = periodoLote;
  return copia;
}

/**
 * Valida el lote completo. Si hay cualquier error, `filas` queda vacío: no hay nada que escribir.
 * Un lote válido corresponde a un solo ámbito (un periodo, o una sede en infraestructura).
 */
export function validarLoteCifras(
  esquema: EsquemaCategoriaCifras,
  registros: unknown[],
  periodoLote?: string,
): ResultadoValidacionLote {
  const errores: ErrorValidacionCifra[] = [];
  const filas: FilaValidadaCifra[] = [];
  const columnas = mapaColumnas(esquema);

  registros.forEach((crudo, indice) => {
    const fila = indice + 1;
    if (!esObjetoPlano(crudo)) {
      errores.push({
        fila,
        columna: 'registros',
        mensaje: 'Cada registro debe ser un objeto.',
      });
      return;
    }

    const registro = completarPeriodo(esquema, crudo, periodoLote);
    const celdas = new Map<string, unknown>();
    const vistas = new Set<string>();

    for (const [llave, valor] of Object.entries(registro)) {
      const columna = columnas.get(normalizarClaveCifras(llave));
      if (!columna) {
        errores.push({
          fila,
          columna: llave,
          mensaje: `La columna ${llave} no pertenece al esquema de la categoría.`,
        });
        continue;
      }
      if (vistas.has(columna.clave)) {
        errores.push({
          fila,
          columna: columna.clave,
          mensaje: `La columna ${columna.clave} está repetida.`,
        });
        continue;
      }
      vistas.add(columna.clave);
      celdas.set(columna.clave, valor);
    }

    const datos: Record<string, unknown> = {};
    let filaInvalida = errores.some((error) => error.fila === fila);

    for (const columna of columnasPersistidas(esquema)) {
      const resultado = validarColumna(columna, celdas.get(columna.clave));
      if (resultado.error) {
        errores.push({ fila, columna: columna.clave, mensaje: resultado.error });
        filaInvalida = true;
        continue;
      }
      if (!resultado.ausente && resultado.valor !== undefined) {
        datos[columna.clave] = resultado.valor;
      }
    }

    if (periodoLote && esquema.claveReemplazo !== 'sede') {
      const ambito = datos[esquema.claveReemplazo];
      if (typeof ambito === 'string' && ambito !== periodoLote) {
        errores.push({
          fila,
          columna: esquema.claveReemplazo,
          mensaje: `La columna ${esquema.claveReemplazo} no coincide con el periodo del lote (${periodoLote}).`,
        });
        filaInvalida = true;
      }
    }

    const banderas = esquema.columnas.filter((columna) => columna.bandera);
    if (!filaInvalida && banderas.length > 0) {
      const suma = banderas.reduce((total, columna) => total + Number(datos[columna.clave] ?? 0), 0);
      if (suma !== 1) {
        errores.push({
          fila,
          columna: banderas[0].clave,
          mensaje: `Las columnas ${banderas.map((columna) => columna.clave).join(', ')} deben sumar 1.`,
        });
        filaInvalida = true;
      }
    }

    const paresFecha: Array<[string, string]> = [
      ['inicio_siac', 'finalizacion_siac'],
      ['fecha_inicio', 'fecha_fin'],
    ];
    for (const [inicioClave, finClave] of paresFecha) {
      const inicio = datos[inicioClave];
      const fin = datos[finClave];
      if (!filaInvalida && inicio instanceof Date && fin instanceof Date && fin.getTime() < inicio.getTime()) {
        errores.push({
          fila,
          columna: finClave,
          mensaje: `La columna ${finClave} debe ser mayor o igual que ${inicioClave}.`,
        });
        filaInvalida = true;
      }
    }

    if (!filaInvalida) {
      const ambito = datos[esquema.claveReemplazo];
      filas.push({ fila, ambito: String(ambito), datos });
    }
  });

  if (filas.length > 0 && errores.length === 0) {
    const esperado = filas[0].ambito;
    const distintas = filas.some((fila) => fila.ambito !== esperado);
    if (distintas) {
      const textoAmbito = esquema.claveReemplazo === 'sede' ? 'una sola sede' : 'un solo periodo';
      for (const fila of filas) {
        if (fila.ambito === esperado) continue;
        errores.push({
          fila: fila.fila,
          columna: esquema.claveReemplazo,
          mensaje: `El lote debe corresponder a ${textoAmbito} (${esperado}).`,
        });
      }
    }
  }

  const resumen = resumir(registros.length, errores);
  return {
    ...resumen,
    errores,
    filas: errores.length > 0 ? [] : filas,
  };
}
