import { ESQUEMA_ASEGURAMIENTO } from './esquema-aseguramiento';
import { ESQUEMA_EGRESADOS } from './esquema-egresados';
import { ESQUEMA_ESTUDIANTES } from './esquema-estudiantes';
import { ESQUEMA_INFRAESTRUCTURA } from './esquema-infraestructura';
import { ESQUEMA_INVESTIGACION } from './esquema-investigacion';
import { ESQUEMA_PROFESORES } from './esquema-profesores';
import { normalizarClaveCifras } from './normalizacion';
import { ColumnaEsquemaCifras, EsquemaCategoriaCifras } from './tipos';

export * from './tipos';
export * from './normalizacion';
export * from './validador';
export * from './enums';

/** Categorías que se cargan por registros (una fila por entidad). */
export const ESQUEMAS_REGISTRO: Record<string, EsquemaCategoriaCifras> = {
  estudiantes: ESQUEMA_ESTUDIANTES,
  profesores: ESQUEMA_PROFESORES,
  egresados: ESQUEMA_EGRESADOS,
  investigacion: ESQUEMA_INVESTIGACION,
  aseguramiento: ESQUEMA_ASEGURAMIENTO,
  infraestructura: ESQUEMA_INFRAESTRUCTURA,
};

export const CATEGORIAS_REGISTRO: string[] = Object.keys(ESQUEMAS_REGISTRO);

export function obtenerEsquemaCategoria(
  categoriaId: string,
): EsquemaCategoriaCifras | null {
  return ESQUEMAS_REGISTRO[categoriaId] ?? null;
}

export function esCategoriaDeRegistros(categoriaId: string): boolean {
  return categoriaId in ESQUEMAS_REGISTRO;
}

/** Índice encabezado normalizado (y alias) → columna. */
export function mapaColumnasEsquema(
  esquema: EsquemaCategoriaCifras,
): Map<string, ColumnaEsquemaCifras> {
  const mapa = new Map<string, ColumnaEsquemaCifras>();
  for (const columna of esquema.columnas) {
    mapa.set(normalizarClaveCifras(columna.encabezado), columna);
    for (const alias of columna.alias ?? []) {
      mapa.set(normalizarClaveCifras(alias), columna);
    }
  }
  return mapa;
}

export function columnaPorClave(
  esquema: EsquemaCategoriaCifras,
  clave: string,
): ColumnaEsquemaCifras | undefined {
  return esquema.columnas.find((columna) => columna.clave === clave);
}
