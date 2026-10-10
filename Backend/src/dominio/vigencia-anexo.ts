import { CategoriaAnexo, EstadoVigencia } from '@prisma/client';

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

/**
 * RN-003 (R-D): hay un anexo de categoría «Infraestructura» vencido a la fecha de referencia.
 * Usa la categoría explícita (ya no busca «infraestructura» en el tipo libre) y el vencimiento real.
 */
export function hayAnexoInfraestructuraVencido(
  anexos: { categoria: CategoriaAnexo; fechaVencimiento: Date }[],
  referencia: Date = new Date(),
): boolean {
  return anexos.some(
    (anexo) =>
      anexo.categoria === CategoriaAnexo.Infraestructura &&
      calcularEstadoAnexo(anexo.fechaVencimiento, referencia) === EstadoVigencia.Vencido,
  );
}

/**
 * Vencimiento del anexo a partir del certificado: la fecha de vencimiento que trae el documento o,
 * si solo se conoce la expedición, expedición + años de vigencia. Devuelve null si no hay datos.
 */
export function calcularVencimientoAnexo(datos: {
  fechaVencimiento?: Date | null;
  fechaExpedicion?: Date | null;
  aniosVigencia?: number | null;
}): Date | null {
  if (datos.fechaVencimiento) return datos.fechaVencimiento;
  if (datos.fechaExpedicion && datos.aniosVigencia) {
    const fin = new Date(datos.fechaExpedicion);
    fin.setUTCFullYear(fin.getUTCFullYear() + datos.aniosVigencia);
    return fin;
  }
  return null;
}
