/** Validación compartida del periodo de cifras: AAAA o AAAA-S (S = 1|2). */
export const REGEX_PERIODO_CIFRAS = /^\d{4}(-[12])?$/;

export const MENSAJE_PERIODO_INVALIDO =
  'El periodo debe tener formato AAAA-S (ej. 2026-1) o AAAA.';

export function esPeriodoValido(periodo: string): boolean {
  return REGEX_PERIODO_CIFRAS.test(periodo.trim());
}
