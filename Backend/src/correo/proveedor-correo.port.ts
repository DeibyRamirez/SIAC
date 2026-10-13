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
