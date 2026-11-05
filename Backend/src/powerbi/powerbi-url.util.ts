import { createHash } from 'node:crypto';

import { prepararUrlInformePowerBi } from './validar-url-informe';

export function hashUrlPublicaPowerBi(urlNormalizada: string): string {
  return createHash('sha256').update(urlNormalizada, 'utf8').digest('hex');
}

/** Acepta URL limpia o HTML de iframe; devuelve la URL normalizada o cadena vacía. */
export function prepararUrlPublicaPowerBiEntrada(valor: string | undefined | null): string {
  return prepararUrlInformePowerBi(valor);
}
