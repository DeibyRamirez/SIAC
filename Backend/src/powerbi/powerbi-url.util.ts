import { createHash } from 'node:crypto';

import { normalizarUrlPublicaPowerBi } from '../common/config/configuracion.env';

const PREFIJO = 'https://app.powerbi.com/view?r=';

export function hashUrlPublicaPowerBi(urlNormalizada: string): string {
  return createHash('sha256').update(urlNormalizada, 'utf8').digest('hex');
}

/** Acepta URL limpia o HTML de iframe; devuelve URL normalizada o cadena vacía. */
export function prepararUrlPublicaPowerBiEntrada(valor: string | undefined | null): string {
  const crudo = valor?.trim() ?? '';
  if (!crudo) return '';

  const directa = normalizarUrlPublicaPowerBi(crudo);
  if (directa) return directa;

  const escapado = PREFIJO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const coincidencia = crudo.match(new RegExp(`${escapado}[^"'\\s>]+`, 'i'))?.[0];
  return coincidencia ? normalizarUrlPublicaPowerBi(coincidencia) : '';
}
