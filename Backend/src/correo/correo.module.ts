import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CorreoService } from './correo.service';
import { CorreoNuloProveedor } from './correo-nulo.proveedor';
import { PROVEEDOR_CORREO, ProveedorCorreo } from './proveedor-correo.port';
import { ResendProveedorCorreo } from './resend.proveedor';
import { SmtpProveedorCorreo } from './smtp.proveedor';
import { resolverCanalCorreo } from './resolver-canal-correo';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PROVEEDOR_CORREO,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ProveedorCorreo => {
        const canal = resolverCanalCorreo(config);
        if (canal === 'resend') return new ResendProveedorCorreo(config);
        if (canal === 'smtp') return new SmtpProveedorCorreo(config);
        return new CorreoNuloProveedor();
      },
    },
    CorreoService,
  ],
  exports: [CorreoService],
})
export class CorreoModule {}
