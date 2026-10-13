import { Injectable, Logger } from '@nestjs/common';
import { MensajeCorreo, ProveedorCorreo } from './proveedor-correo.port';

@Injectable()
export class CorreoNuloProveedor implements ProveedorCorreo {
  private readonly logger = new Logger(CorreoNuloProveedor.name);

  async enviar(mensaje: MensajeCorreo): Promise<void> {
    this.logger.debug(
      `Correo omitido (sin canal): ${mensaje.asunto} → ${mensaje.destinatario}`,
    );
  }
}
