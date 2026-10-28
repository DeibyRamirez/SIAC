import { Injectable, Logger } from '@nestjs/common';
import { CorreoSinCanalError, MensajeCorreo, ProveedorCorreo } from './proveedor-correo.port';

/** Proveedor sin canal: no envía y lo informa al outbox con `CorreoSinCanalError` (fix K). */
@Injectable()
export class CorreoNuloProveedor implements ProveedorCorreo {
  private readonly logger = new Logger(CorreoNuloProveedor.name);

  async enviar(mensaje: MensajeCorreo): Promise<void> {
    this.logger.debug(
      `Correo omitido (sin canal): ${mensaje.asunto} → ${mensaje.destinatario}`,
    );
    throw new CorreoSinCanalError();
  }
}
