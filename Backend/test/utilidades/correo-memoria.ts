import { MensajeCorreo, ProveedorCorreo } from '../../src/correo/proveedor-correo.port';

/**
 * Proveedor de correo en memoria para las pruebas (T-006.3): registra cada mensaje
 * enviado y permite simular fallos sin tocar Resend/SMTP.
 */
export class CorreoMemoriaProveedor implements ProveedorCorreo {
  readonly mensajes: MensajeCorreo[] = [];
  private fallosRestantes = 0;

  fallarSiguientes(cantidad: number): void {
    this.fallosRestantes = cantidad;
  }

  async enviar(mensaje: MensajeCorreo): Promise<void> {
    if (this.fallosRestantes > 0) {
      this.fallosRestantes -= 1;
      throw new Error('Fallo simulado del proveedor de correo.');
    }
    this.mensajes.push({ ...mensaje });
  }

  limpiar(): void {
    this.mensajes.length = 0;
  }
}
