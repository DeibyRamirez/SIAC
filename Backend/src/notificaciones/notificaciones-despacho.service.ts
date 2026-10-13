import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CorreoService } from '../correo/correo.service';
import { UsuarioRepositorio } from '../usuarios/usuario.repositorio';
import { NotificacionesService } from './notificaciones.service';

export interface PayloadNotificacion {
  usuarioId: string;
  mensaje: string;
  tipo: string;
  asuntoCorreo?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificacionesDespachoService {
  private readonly logger = new Logger(NotificacionesDespachoService.name);

  constructor(
    private readonly notificaciones: NotificacionesService,
    private readonly usuarios: UsuarioRepositorio,
    private readonly correo: CorreoService,
  ) {}

  async notificar(payload: PayloadNotificacion): Promise<void> {
    await this.notificaciones.crear(
      payload.usuarioId,
      payload.mensaje,
      payload.tipo,
      payload.metadata,
    );

    const usuario = await this.usuarios.buscarPorId(payload.usuarioId);
    if (!usuario?.correo) return;

    const asunto = payload.asuntoCorreo ?? `[SIAC] ${payload.tipo}`;
    try {
      await this.correo.enviar({
        destinatario: usuario.correo,
        asunto,
        textoPlano: payload.mensaje,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar correo a ${usuario.correo} (${payload.tipo}): ${error}`,
      );
    }
  }

  async notificarVarios(
    usuarioIds: string[],
    mensaje: string,
    tipo: string,
    opciones?: { asuntoCorreo?: string; metadata?: Prisma.InputJsonValue },
  ): Promise<void> {
    const unicos = [...new Set(usuarioIds)];
    for (const usuarioId of unicos) {
      await this.notificar({
        usuarioId,
        mensaje,
        tipo,
        asuntoCorreo: opciones?.asuntoCorreo,
        metadata: opciones?.metadata,
      });
    }
  }

  /** Vigencia: in-app si hay usuario; correo si el responsable incluye @. */
  async notificarVigencia(
    responsable: string,
    mensaje: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<void> {
    const correo = responsable.includes('@')
      ? responsable.trim().toLowerCase()
      : null;

    if (correo) {
      const usuario = await this.usuarios.buscarPorCorreo(correo);
      if (usuario) {
        await this.notificar({
          usuarioId: usuario.id,
          mensaje,
          tipo: 'vigencia',
          asuntoCorreo: '[SIAC] Alerta de vencimiento',
          metadata,
        });
        return;
      }

      try {
        await this.correo.enviar({
          destinatario: correo,
          asunto: '[SIAC] Alerta de vencimiento',
          textoPlano: mensaje,
        });
      } catch (error) {
        this.logger.error(`Correo vigencia a ${correo}: ${error}`);
      }
      return;
    }

    const usuario = await this.usuarios.buscarPorCorreo(responsable.trim().toLowerCase());
    if (usuario) {
      await this.notificar({
        usuarioId: usuario.id,
        mensaje,
        tipo: 'vigencia',
        asuntoCorreo: '[SIAC] Alerta de vencimiento',
        metadata,
      });
    }
  }
}
