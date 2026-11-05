export const PROVEEDOR_CORREO = 'PROVEEDOR_CORREO';

export interface MensajeCorreo {
  destinatario: string;
  asunto: string;
  textoPlano: string;
  textoHtml?: string;
}

export interface ProveedorCorreo {
  enviar(mensaje: MensajeCorreo): Promise<void>;
}

/**
 * Fix K (27/10): el proveedor nulo (sin canal) no envía nada. Lo lanza en lugar de «simular»
 * el envío para que el outbox marque la fila Descartado y no Enviado.
 */
export class CorreoSinCanalError extends Error {
  constructor() {
    super('Sin canal de correo (CORREO_CANAL vacío, «ninguno» o no válido): no se envió.');
    this.name = 'CorreoSinCanalError';
  }
}
