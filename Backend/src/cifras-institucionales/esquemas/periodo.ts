/** Periodo de cifras: AAAA o AAAA-S, con S en {1, 2}. */
export const REGEX_PERIODO_CIFRAS = /^\d{4}(-[12])?$/;

export const MENSAJE_PERIODO_INVALIDO =
  'El periodo debe tener formato AAAA o AAAA-S (ejemplo 2026-1).';

export function esPeriodoValido(periodo: string): boolean {
  return REGEX_PERIODO_CIFRAS.test(periodo.trim());
}
