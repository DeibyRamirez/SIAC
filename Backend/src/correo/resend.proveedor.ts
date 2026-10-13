import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { prepararEnvioResend, resolverRemitenteCorreo } from './resolver-envio-resend';
import { MensajeCorreo, ProveedorCorreo } from './proveedor-correo.port';

@Injectable()
export class ResendProveedorCorreo implements ProveedorCorreo {
  private readonly logger = new Logger(ResendProveedorCorreo.name);
  private readonly cliente: Resend;
  private readonly remitente: string;
  private readonly correoSandbox: string | undefined;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY') ?? '';
    this.cliente = new Resend(apiKey);
    this.remitente = resolverRemitenteCorreo((clave) => config.get<string>(clave));
    this.correoSandbox = config.get<string>('RESEND_CORREO_SANDBOX');
  }

  async enviar(mensaje: MensajeCorreo): Promise<void> {
    const preparado = prepararEnvioResend(mensaje, this.correoSandbox);

    if (preparado.redirigidoSandbox && preparado.destinatarioOriginal) {
      this.logger.warn(
        `Resend sandbox: envío a ${preparado.destinatario} (destino real: ${preparado.destinatarioOriginal})`,
      );
    }

    const { error } = await this.cliente.emails.send({
      from: this.remitente,
      to: preparado.destinatario,
      subject: preparado.asunto,
      text: preparado.textoPlano,
      html: preparado.textoHtml,
    });

    if (error) {
      this.logger.error(`Resend: ${error.message}`);
      throw new Error(error.message);
    }
  }
}
