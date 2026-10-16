/**
 * T-007.3c (C-4): claves idempotentes de eventos de notificación.
 * Formato estable:
 *  - vigencia:{entidadId}:{resolucionId}:{fechaFinISO}:{umbral}:{usuarioId}
 *  - anexo_d1:{anexoId}:{fechaVencimientoISO}:{usuarioId}
 *  - dictamen:{evidenciaId}:v{version}:{usuarioId}
 *  - revision_pendiente:{evidenciaId}:v{version}:{usuarioId}
 *  - avance:{programaId}:{umbral}:{usuarioId}
 */
export type UmbralVigenciaEvento = 'amarillo' | 'rojo' | 'vencido';

export interface ClaveVigenciaInput {
  /** Programa o institución. */
  entidadId: string;
  /** Id de la resolución MEN vigente (o la fecha de resolución si no hay fila). */
  resolucionId: string;
  fechaFinIso: string;
  umbral: UmbralVigenciaEvento;
  usuarioId: string;
  /**
   * §0: token de la sesión demo (marca de inicio). Sustituye a la resolución en la clave para que
   * la demo acelerada nunca bloquee las alertas reales (y viceversa).
   */
  tokenDemo?: string;
}

export function claveVigencia(input: ClaveVigenciaInput): string {
  const resolucion = input.tokenDemo ? `demo-${input.tokenDemo}` : input.resolucionId;
  return `vigencia:${input.entidadId}:${resolucion}:${input.fechaFinIso}:${input.umbral}:${input.usuarioId}`;
}

export interface ClaveAnexoD1Input {
  anexoId: string;
  /** Fecha de vencimiento del anexo en ISO (AAAA-MM-DD…). */
  fechaVencimientoIso: string;
  usuarioId: string;
}

export function claveAnexoD1(input: ClaveAnexoD1Input): string {
  return `anexo_d1:${input.anexoId}:${input.fechaVencimientoIso}:${input.usuarioId}`;
}

export function claveDictamen(evidenciaId: string, version: number, usuarioId: string): string {
  return `dictamen:${evidenciaId}:v${version}:${usuarioId}`;
}

export function claveRevisionPendiente(
  evidenciaId: string,
  version: number,
  usuarioId: string,
): string {
  return `revision_pendiente:${evidenciaId}:v${version}:${usuarioId}`;
}

/**
 * `avance:{programaId}:{umbral}:{usuarioId}`: notifica una sola vez por programa y umbral (y
 * usuario). Al cambiar el semáforo de avance se genera una clave nueva; mientras el programa
 * siga en el mismo umbral, el despacho idempotente no repite el aviso.
 */
export function claveAvance(programaId: string, umbral: string, usuarioId: string): string {
  return `avance:${programaId}:${umbral}:${usuarioId}`;
}
