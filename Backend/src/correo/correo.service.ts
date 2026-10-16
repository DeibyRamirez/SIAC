import { Inject, Injectable } from '@nestjs/common';
import { MensajeCorreo, PROVEEDOR_CORREO, ProveedorCorreo } from './proveedor-correo.port';

@Injectable()
export class CorreoService {
  constructor(
    @Inject(PROVEEDOR_CORREO) private readonly proveedor: ProveedorCorreo,
  ) {}

  enviar(mensaje: MensajeCorreo): Promise<void> {
    return this.proveedor.enviar(mensaje);
  }
}
