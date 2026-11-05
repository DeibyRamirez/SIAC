import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PlantillaCorreo } from '../correo/plantillas';
import { construirPlantillaCorreoNotificacion } from '../correo/plantillas-notificacion';
import { PrismaService } from '../prisma/prisma.module';
import { ejecutarComoSistema, ejecutarComoSistemaEnTransaccion } from '../prisma/contexto-sistema';

export interface EventoNotificacion {
  /** T-007.3c: clave idempotente del evento (misma para AlertaInApp y NotificacionSalida). */
  claveEvento: string;
  usuarioId: string;
  mensaje: string;
  tipo: string;
  asuntoCorreo?: string;
  metadata?: Prisma.InputJsonValue;
  /** Plantilla específica (T-007.3h); si falta se usa la genérica por tipo. */
  plantilla?: PlantillaCorreo;
}

export interface EventoCorreoExterno {
  claveEvento: string;
  /** Responsable sin cuenta en SIAC: solo se encola el correo. */
  destinatarioCorreo: string;
  mensaje: string;
  tipo: string;
  asuntoCorreo?: string;
  metadata?: Prisma.InputJsonValue;
  plantilla?: PlantillaCorreo;
}

interface PayloadCorreo {
  mensaje: string;
  asunto: string;
  textoPlano: string;
  textoHtml: string;
  metadata?: unknown;
}

/**
 * T-007.3c (C-4): el despacho crea la alerta in-app y la fila de outbox dentro de la misma
 * transacción que el evento de negocio (o una propia si no se recibe `tx`). El correo ya no se
 * envía dentro de la petición: lo procesa `ProcesadorNotificacionesSalidaService` con reintentos.
 * La deduplicación es por `claveEvento` único, no por búsquedas sobre `metadata`.
 */
@Injectable()
export class NotificacionesDespachoService {
  private readonly logger = new Logger(NotificacionesDespachoService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Crea alerta in-app + outbox para un usuario (idempotente por `claveEvento`). */
  async notificar(
    evento: EventoNotificacion,
    tx?: Prisma.TransactionClient,
  ): Promise<{ creada: boolean }> {
    // RLS: la alerta y el outbox son filas de otro usuario → ruta de sistema.
    if (tx) return ejecutarComoSistemaEnTransaccion(tx, () => this.notificarEnTransaccion(tx, evento));
    try {
      return await ejecutarComoSistema(() =>
        this.prisma.$transaction((cliente) => this.notificarEnTransaccion(cliente, evento)),
      );
    } catch (error) {
      if (esClaveDuplicada(error)) {
        this.logger.warn(`Evento ya notificado (clave ${evento.claveEvento}); se omite.`);
        return { creada: false };
      }
      throw error;
    }
  }

  /** Variante para usar dentro de una transacción de negocio ya abierta. */
  async notificarEnTransaccion(
    cliente: Prisma.TransactionClient,
    evento: EventoNotificacion,
  ): Promise<{ creada: boolean }> {
    const yaExiste = await this.existeEvento(cliente, evento.claveEvento);
    if (yaExiste) return { creada: false };

    const usuario = await cliente.usuario.findUnique({
      where: { id: evento.usuarioId },
      select: { correo: true },
    });

    await cliente.alertaInApp.create({
      data: {
        usuarioId: evento.usuarioId,
        mensaje: evento.mensaje,
        tipo: evento.tipo,
        metadata: evento.metadata,
        claveEvento: evento.claveEvento,
      },
    });

    const correo = usuario?.correo?.trim().toLowerCase();
    if (correo) {
      await cliente.notificacionSalida.create({
        data: {
          claveEvento: evento.claveEvento,
          usuarioId: evento.usuarioId,
          destinatarioCorreo: correo,
          canal: 'correo',
          tipo: evento.tipo,
          payload: this.payloadCorreo(evento) as unknown as Prisma.InputJsonValue,
        },
      });
    }
    return { creada: true };
  }

  /** Responsable externo (correo sin cuenta): encola solo la fila de outbox, idempotente. */
  async encolarCorreoExterno(
    evento: EventoCorreoExterno,
    tx?: Prisma.TransactionClient,
  ): Promise<{ creada: boolean }> {
    const ejecutar = async (cliente: Prisma.TransactionClient) => {
      const yaExiste = await cliente.notificacionSalida.findUnique({
        where: { claveEvento: evento.claveEvento },
      });
      if (yaExiste) return { creada: false };
      await cliente.notificacionSalida.create({
        data: {
          claveEvento: evento.claveEvento,
          usuarioId: null,
          destinatarioCorreo: evento.destinatarioCorreo.trim().toLowerCase(),
          canal: 'correo',
          tipo: evento.tipo,
          payload: this.payloadCorreo(evento) as unknown as Prisma.InputJsonValue,
        },
      });
      return { creada: true };
    };
    if (tx) return ejecutarComoSistemaEnTransaccion(tx, () => ejecutar(tx));
    try {
      return await ejecutarComoSistema(() => this.prisma.$transaction(ejecutar));
    } catch (error) {
      if (esClaveDuplicada(error)) return { creada: false };
      throw error;
    }
  }

  private async existeEvento(cliente: Prisma.TransactionClient, claveEvento: string) {
    const alerta = await cliente.alertaInApp.findUnique({ where: { claveEvento } });
    if (alerta) return true;
    const salida = await cliente.notificacionSalida.findUnique({ where: { claveEvento } });
    return Boolean(salida);
  }

  private payloadCorreo(evento: {
    mensaje: string;
    tipo: string;
    asuntoCorreo?: string;
    metadata?: Prisma.InputJsonValue;
    plantilla?: PlantillaCorreo;
  }): PayloadCorreo {
    const plantilla = normalizarPlantilla(
      evento.plantilla ??
        construirPlantillaCorreoNotificacion(
          evento.tipo,
          evento.mensaje,
          evento.asuntoCorreo,
          evento.metadata as Record<string, unknown> | undefined,
        ),
    );
    return {
      mensaje: evento.mensaje,
      asunto: plantilla.asunto,
      textoPlano: plantilla.textoPlano,
      textoHtml: plantilla.textoHtml,
      metadata: evento.metadata ?? null,
    };
  }
}

function normalizarPlantilla(
  plantilla: PlantillaCorreo | { asunto: string; textoPlano: string; textoHtml: string },
): { asunto: string; textoPlano: string; textoHtml: string } {
  if ('texto' in plantilla) {
    return { asunto: plantilla.asunto, textoPlano: plantilla.texto, textoHtml: plantilla.html };
  }
  return plantilla;
}

function esClaveDuplicada(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  );
}
