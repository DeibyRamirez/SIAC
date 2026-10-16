import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { resolverRemitenteCorreo } from './resolver-envio-resend';
import { MensajeCorreo, ProveedorCorreo } from './proveedor-correo.port';

@Injectable()
export class SmtpProveedorCorreo implements ProveedorCorreo {
  private readonly logger = new Logger(SmtpProveedorCorreo.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly remitente: string;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST') ?? '';
    this.transporter = nodemailer.createTransport({
      host,
      port: parseInt(config.get('SMTP_PORT') ?? '587', 10),
      auth: {
        user: config.get('SMTP_USUARIO'),
        pass: config.get('SMTP_CONTRASENA'),
      },
    });
    this.remitente = resolverRemitenteCorreo(
      (clave) => config.get<string>(clave),
      'planeacion@uniautonoma.edu.co',
    );
  }

  async enviar(mensaje: MensajeCorreo): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.remitente,
        to: mensaje.destinatario,
        subject: mensaje.asunto,
        text: mensaje.textoPlano,
        html: mensaje.textoHtml,
      });
    } catch (error) {
      this.logger.error(`SMTP: ${error}`);
      throw error;
    }
  }
}
