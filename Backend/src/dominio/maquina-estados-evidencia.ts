import { CodigoDocumentoGuia, EstadoEvidencia } from '@prisma/client';

/**
 * Máquina de estados de la evidencia (HU-006, T-006.2).
 *
 * Ciclo G1-G4 (decisión del PO, 06/10): el Revisor aprueba (Cumple/Validado) o deja
 * «Con observaciones»; «Rechazado» queda solo para evidencias legadas sin guía.
 *
 * Tabla única de transiciones usada por `enviarRevision`, `dictaminar` y la carga de
 * una nueva versión (`reemplazarArchivo`, transición al mismo estado).
 */
export type GuiaEvidencia = CodigoDocumentoGuia | null;

/** Guías del flujo G1-G4 (documento con guía). */
const GUIAS_CON_GUIA: GuiaEvidencia[] = [
  CodigoDocumentoGuia.G1,
  CodigoDocumentoGuia.G2,
  CodigoDocumentoGuia.G3,
  CodigoDocumentoGuia.G4,
];

const TODAS_LAS_GUIAS: GuiaEvidencia[] = [...GUIAS_CON_GUIA, null];

/** G1/G3 se puntúan por checklist; G2/G4 no (Validado/ConObservaciones). */
const GUIAS_CON_PUNTAJE: GuiaEvidencia[] = [
  CodigoDocumentoGuia.G1,
  CodigoDocumentoGuia.G3,
];

/** G2/G4 sin puntaje más las evidencias legadas sin guía. */
const GUIAS_SIN_PUNTAJE_O_LEGADO: GuiaEvidencia[] = [
  CodigoDocumentoGuia.G2,
  CodigoDocumentoGuia.G4,
  null,
];

export interface TransicionEvidencia {
  origen: EstadoEvidencia;
  destino: EstadoEvidencia;
  /** Guías a las que aplica la transición (null = evidencia legada sin guía). */
  guias: GuiaEvidencia[];
  descripcion: string;
}

export const TRANSICIONES_EVIDENCIA: readonly TransicionEvidencia[] = [
  {
    origen: EstadoEvidencia.Borrador,
    destino: EstadoEvidencia.EnRevision,
    guias: TODAS_LAS_GUIAS,
    descripcion: 'Profesor envía el borrador a revisión.',
  },
  {
    origen: EstadoEvidencia.ConObservaciones,
    destino: EstadoEvidencia.EnRevision,
    guias: TODAS_LAS_GUIAS,
    descripcion: 'Profesor reenvía a revisión con la versión corregida.',
  },
  {
    origen: EstadoEvidencia.Rechazado,
    destino: EstadoEvidencia.EnRevision,
    guias: TODAS_LAS_GUIAS,
    descripcion: 'Profesor reenvía una evidencia legada rechazada.',
  },
  {
    origen: EstadoEvidencia.Borrador,
    destino: EstadoEvidencia.Borrador,
    guias: TODAS_LAS_GUIAS,
    descripcion: 'Profesor reemplaza el archivo del borrador (nueva versión).',
  },
  {
    origen: EstadoEvidencia.ConObservaciones,
    destino: EstadoEvidencia.ConObservaciones,
    guias: TODAS_LAS_GUIAS,
    descripcion: 'Profesor sube una nueva versión corregida sin reenviar aún.',
  },
  {
    origen: EstadoEvidencia.Rechazado,
    destino: EstadoEvidencia.Rechazado,
    guias: TODAS_LAS_GUIAS,
    descripcion: 'Profesor sube una nueva versión de una evidencia legada rechazada.',
  },
  {
    origen: EstadoEvidencia.EnRevision,
    destino: EstadoEvidencia.Cumple,
    guias: GUIAS_CON_PUNTAJE,
    descripcion: 'Revisor registra 9/9 (G1) o 6/6 (G3) en el checklist.',
  },
  {
    origen: EstadoEvidencia.EnRevision,
    destino: EstadoEvidencia.ConObservaciones,
    guias: GUIAS_CON_GUIA,
    descripcion: 'Revisor deja el documento con observaciones (checklist n < total o texto).',
  },
  {
    origen: EstadoEvidencia.EnRevision,
    destino: EstadoEvidencia.Validado,
    guias: GUIAS_SIN_PUNTAJE_O_LEGADO,
    descripcion: 'Revisor aprueba G2/G4 (sin puntaje) o una evidencia legada sin guía.',
  },
  {
    origen: EstadoEvidencia.EnRevision,
    destino: EstadoEvidencia.Rechazado,
    guias: [null],
    descripcion: 'Revisor rechaza una evidencia legada sin guía.',
  },
];

export function transicionPermitida(
  origen: EstadoEvidencia | null | undefined,
  destino: EstadoEvidencia | null | undefined,
  guia: GuiaEvidencia | undefined,
): boolean {
  if (!origen || !destino) return false;
  const guiaNormalizada: GuiaEvidencia = guia ?? null;
  return TRANSICIONES_EVIDENCIA.some(
    (transicion) =>
      transicion.origen === origen &&
      transicion.destino === destino &&
      transicion.guias.includes(guiaNormalizada),
  );
}
