import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CorreoService } from './correo.service';
import { CorreoNuloProveedor } from './correo-nulo.proveedor';
import { PROVEEDOR_CORREO, ProveedorCorreo } from './proveedor-correo.port';
import { ResendProveedorCorreo } from './resend.proveedor';
import { SmtpProveedorCorreo } from './smtp.proveedor';
import { resolverCanalCorreo } from './resolver-canal-correo';
import { validarConfiguracionCorreo } from './validar-configuracion-correo';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PROVEEDOR_CORREO,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ProveedorCorreo => {
        const canal = resolverCanalCorreo(config);
        // T-007.3f: smtp exige SMTP_HOST y remitente; resend exige RESEND_API_KEY y remitente.
        // El remitente puede venir por CORREO_DESDE o, de respaldo, CORREO_REMITENTE / SMTP_FROM.
        validarConfiguracionCorreo(canal, {
          smtpHost: config.get<string>('SMTP_HOST'),
          resendApiKey: config.get<string>('RESEND_API_KEY'),
          correoDesde: config.get<string>('correoDesde') ?? config.get<string>('CORREO_DESDE'),
          correoRemitente: config.get<string>('CORREO_REMITENTE'),
          smtpFrom: config.get<string>('SMTP_FROM'),
        });
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
