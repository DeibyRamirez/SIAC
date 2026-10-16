import { CodigoDocumentoGuia, EstadoEvidencia } from '@prisma/client';

export const ESTADOS_BLOQUEAN_NUEVA_EVIDENCIA_MISMA_GUIA: EstadoEvidencia[] = [
  EstadoEvidencia.Borrador,
  EstadoEvidencia.EnRevision,
];

export const ESTADOS_REQUIEREN_CORRECCION_EN_LUGAR: EstadoEvidencia[] = [
  EstadoEvidencia.ConObservaciones,
  EstadoEvidencia.Rechazado,
];

export interface DocumentoProgresoCarga {
  codigoGuia: CodigoDocumentoGuia;
  aceptado: boolean;
}

export interface EvidenciaAbiertaPorGuia {
  codigoGuia: CodigoDocumentoGuia;
  estado: EstadoEvidencia;
}

export interface BloqueoCargaGuia {
  codigoGuia: CodigoDocumentoGuia;
  motivo: string;
}

export interface ResultadoReglasCargaGuias {
  guiasDisponiblesCarga: CodigoDocumentoGuia[];
  bloqueosCarga: BloqueoCargaGuia[];
}

function guiaPredecesoraAceptada(
  codigoGuia: CodigoDocumentoGuia,
  documentos: DocumentoProgresoCarga[],
): boolean {
  const mapa = new Map(documentos.map((d) => [d.codigoGuia, d.aceptado]));
  if (codigoGuia === CodigoDocumentoGuia.G2) {
    return mapa.get(CodigoDocumentoGuia.G1) === true;
  }
  if (codigoGuia === CodigoDocumentoGuia.G4) {
    return mapa.get(CodigoDocumentoGuia.G3) === true;
  }
  return true;
}

function motivoBloqueoAbierta(estado: EstadoEvidencia, codigoGuia: CodigoDocumentoGuia): string {
  if (ESTADOS_BLOQUEAN_NUEVA_EVIDENCIA_MISMA_GUIA.includes(estado)) {
    if (estado === EstadoEvidencia.Borrador) {
      return `Ya existe un borrador de ${codigoGuia}. Envíelo a revisión o elimínelo antes de crear otro.`;
    }
    return `El documento ${codigoGuia} está pendiente de verificación por el revisor. Espere el dictamen antes de cargar otro del mismo tipo.`;
  }
  if (ESTADOS_REQUIEREN_CORRECCION_EN_LUGAR.includes(estado)) {
    return `El documento ${codigoGuia} quedó con observaciones. Suba una nueva versión en la evidencia existente, no cree otra.`;
  }
  return `No puede cargar un nuevo ${codigoGuia} en este momento.`;
}

export function calcularReglasCargaGuias(
  codigosTramite: CodigoDocumentoGuia[],
  documentos: DocumentoProgresoCarga[],
  evidenciasAbiertas: EvidenciaAbiertaPorGuia[],
): ResultadoReglasCargaGuias {
  const bloqueosCarga: BloqueoCargaGuia[] = [];
  const guiasDisponiblesCarga: CodigoDocumentoGuia[] = [];

  const abiertaPorGuia = new Map<CodigoDocumentoGuia, EstadoEvidencia>();
  for (const ev of evidenciasAbiertas) {
    if (!abiertaPorGuia.has(ev.codigoGuia)) {
      abiertaPorGuia.set(ev.codigoGuia, ev.estado);
    }
  }

  const docPorGuia = new Map(documentos.map((d) => [d.codigoGuia, d]));

  for (const codigoGuia of codigosTramite) {
    const estadoAbierto = abiertaPorGuia.get(codigoGuia);
    if (estadoAbierto) {
      bloqueosCarga.push({
        codigoGuia,
        motivo: motivoBloqueoAbierta(estadoAbierto, codigoGuia),
      });
      continue;
    }

    const progreso = docPorGuia.get(codigoGuia);
    if (progreso?.aceptado) {
      bloqueosCarga.push({
        codigoGuia,
        motivo: `El documento ${codigoGuia} ya está aprobado en el trámite activo.`,
      });
      continue;
    }

    if (!guiaPredecesoraAceptada(codigoGuia, documentos)) {
      const predecesora =
        codigoGuia === CodigoDocumentoGuia.G2
          ? CodigoDocumentoGuia.G1
          : CodigoDocumentoGuia.G4;
      bloqueosCarga.push({
        codigoGuia,
        motivo: `Debe aprobarse ${predecesora} antes de cargar ${codigoGuia}.`,
      });
      continue;
    }

    guiasDisponiblesCarga.push(codigoGuia);
  }

  return { guiasDisponiblesCarga, bloqueosCarga };
}

export function validarNuevaCargaEvidencia(
  codigoGuia: CodigoDocumentoGuia,
  reglas: ResultadoReglasCargaGuias,
): string | null {
  if (reglas.guiasDisponiblesCarga.includes(codigoGuia)) {
    return null;
  }
  const bloqueo = reglas.bloqueosCarga.find((b) => b.codigoGuia === codigoGuia);
  return bloqueo?.motivo ?? `No puede cargar ${codigoGuia} en el trámite actual.`;
}
