import { EstadoVigencia } from '@prisma/client';

/** Días antes del vencimiento en que un anexo pasa a «Próximo». */
export const DIAS_AVISO_ANEXO_PROXIMO = 30;

const MS_POR_DIA = 1000 * 60 * 60 * 24;

/**
 * Estado de un anexo de vigencia calculado al consultar (R-D, causa 7): no depende de la
 * columna `estado` ni de que el cron de las 6:00 haya corrido.
 */
export function calcularEstadoAnexo(
  fechaVencimiento: Date,
  referencia: Date = new Date(),
): EstadoVigencia {
  const hoy = new Date(referencia);
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);
  const diffDias = Math.ceil((vencimiento.getTime() - hoy.getTime()) / MS_POR_DIA);
  if (diffDias < 0) return EstadoVigencia.Vencido;
  if (diffDias <= DIAS_AVISO_ANEXO_PROXIMO) return EstadoVigencia.Proximo;
  return EstadoVigencia.Vigente;
}

/** Sustituye el `estado` guardado por el calculado a partir de `fechaVencimiento`. */
export function conEstadoCalculado<T extends { fechaVencimiento: Date; estado?: EstadoVigencia }>(
  anexo: T,
  referencia: Date = new Date(),
): T & { estado: EstadoVigencia } {
  return { ...anexo, estado: calcularEstadoAnexo(anexo.fechaVencimiento, referencia) };
}
