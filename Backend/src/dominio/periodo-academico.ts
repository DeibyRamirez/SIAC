import { RolUsuario } from '@prisma/client';

/** Colombia no usa horario de verano: America/Bogota es UTC−5 todo el año. */
export const ZONA_BOGOTA = 'America/Bogota';

export const REGEX_PERIODO_ACADEMICO = /^\d{4}-[12]$/;

export const MENSAJE_FORMATO_PERIODO =
  'El periodo debe tener el formato AAAA-1 o AAAA-2 (ejemplo: 2026-1).';

const FORMATEADOR_BOGOTA = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONA_BOGOTA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function partesFechaBogota(fecha: Date): { anio: number; mes: number; dia: number } {
  const partes = FORMATEADOR_BOGOTA.formatToParts(fecha);
  const leer = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find((parte) => parte.type === tipo)?.value);
  return { anio: leer('year'), mes: leer('month'), dia: leer('day') };
}

/** Semestre académico del instante, según el calendario de Bogotá (ene–jun = 1, jul–dic = 2). */
export function periodoAcademicoEnBogota(fecha = new Date()): string {
  const { anio, mes } = partesFechaBogota(fecha);
  return `${anio}-${mes <= 6 ? 1 : 2}`;
}

/**
 * Mediodía en Bogotá de una fecha calendario AAAA-MM-DD.
 * Evita que la medianoche UTC caiga en el día anterior al leer la zona.
 */
export function mediodiaEnBogota(fechaCalendario: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaCalendario)) {
    throw new Error('La fecha calendario debe tener el formato AAAA-MM-DD.');
  }
  return new Date(`${fechaCalendario}T12:00:00-05:00`);
}

/** Periodo de una fecha calendario (resolución MEN), con el mismo criterio de Bogotá. */
export function periodoDeFechaCalendario(fechaCalendario: string): string {
  return periodoAcademicoEnBogota(mediodiaEnBogota(fechaCalendario));
}

export function periodoEsAnterior(periodo: string, referencia = new Date()): boolean {
  return periodo < periodoAcademicoEnBogota(referencia);
}

export function mensajePeriodoInvalido(valor: string): string {
  const mostrado = valor.trim() || '(vacío)';
  return `El periodo «${mostrado}» no es válido. ${MENSAJE_FORMATO_PERIODO}`;
}

/**
 * El Profesor (rol Cargador) no carga en un periodo ya cerrado.
 * Revisor, Administrador y SuperAdmin sí pueden: la restricción es reversible
 * (basta dejar de llamar a esta función).
 */
export function motivoBloqueoCargaPeriodo(
  rol: RolUsuario,
  periodo: string,
  referencia = new Date(),
): string | null {
  if (!REGEX_PERIODO_ACADEMICO.test(periodo) || !periodoEsAnterior(periodo, referencia)) {
    return null;
  }
  if (
    rol === RolUsuario.Revisor ||
    rol === RolUsuario.Administrador ||
    rol === RolUsuario.SuperAdmin
  ) {
    return null;
  }
  return (
    `No puede cargar evidencias en el periodo ${periodo} porque ya cerró. ` +
    `El periodo actual es ${periodoAcademicoEnBogota(referencia)}.`
  );
}
