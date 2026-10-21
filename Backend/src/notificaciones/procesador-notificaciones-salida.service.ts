import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificacionSalida } from '@prisma/client';
import { CorreoService } from '../correo/correo.service';
import { destinatarioPermitidoEnDesarrollo } from '../correo/filtrar-destinatarios-permitidos';
import { PrismaService } from '../prisma/prisma.module';
import { ejecutarComoSistema } from '../prisma/contexto-sistema';

interface PayloadSalida {
  mensaje?: string;
  asunto?: string;
  textoPlano?: string;
  textoHtml?: string;
}

export interface ResumenProcesamientoSalida {
  enviados: number;
  fallidos: number;
  descartados: number;
  pendientes: number;
}

const LOTE_POR_TANDA = 50;

/**
 * T-007.3d (C-4): procesador del outbox de correo.
 * - `@Cron` cada minuto en NestJS (no en la BD) toma Pendiente con `proximoIntentoAt <= ahora`.
 * - Cada fila se reclama con un UPDATE condicionado por estado/intentos que además mueve
 *   `proximoIntentoAt` a `ahora + lease` (`CORREO_LEASE_SEGUNDOS`, 5 min por defecto): si el
 *   envío tarda, otro tick u otra instancia no vuelve a tomar la misma fila en paralelo; si el
 *   proceso muere, la fila se reintenta tras el lease.
 * - Fallo: `intentos++`, `ultimoError` y backoff `CORREO_REINTENTO_BASE_SEGUNDOS · 2^(n-1)`;
 *   al llegar a `CORREO_MAX_INTENTOS` la fila queda Fallido. La alerta in-app nunca se revierte.
 * - En desarrollo, destinatario fuera de `CORREO_DESTINATARIOS_PERMITIDOS` → Descartado.
 * Esta tabla es la bitácora del CA3.
 */
@Injectable()
export class ProcesadorNotificacionesSalidaService {
  private readonly logger = new Logger(ProcesadorNotificacionesSalidaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly correo: CorreoService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'procesar-notificaciones-salida' })
  async procesarPendientesProgramadas(): Promise<void> {
    try {
      const resumen = await this.procesarPendientes();
      if (resumen.enviados + resumen.fallidos + resumen.descartados > 0) {
        this.logger.log(
          `Outbox correo: ${resumen.enviados} enviados, ${resumen.pendientes} en reintento, ${resumen.fallidos} fallidos, ${resumen.descartados} descartados.`,
        );
      }
    } catch (error) {
      this.logger.error(`Error procesando outbox de correo: ${(error as Error).message}`);
    }
  }

  /** Procesa el lote actual de pendientes vencidos (también invocable desde pruebas). */
  async procesarPendientes(ahora: Date = new Date()): Promise<ResumenProcesamientoSalida> {
    return ejecutarComoSistema(async () => {
      const maxIntentos = this.maxIntentos();
      const baseSegundos = this.reintentoBaseSegundos();
      const leaseMs = this.leaseSegundos() * 1000;

      const filas = await this.prisma.notificacionSalida.findMany({
        where: { estado: 'Pendiente', proximoIntentoAt: { lte: ahora } },
        orderBy: { createdAt: 'asc' },
        take: LOTE_POR_TANDA,
      });

      const resumen: ResumenProcesamientoSalida = {
        enviados: 0,
        fallidos: 0,
        descartados: 0,
        pendientes: 0,
      };

      for (const fila of filas) {
        // Reclamo seguro ante varias instancias: solo gana quien conserva estado e intentos.
        // El lease mueve proximoIntentoAt para que otro tick no tome la fila mientras se envía.
        const reclamada = await this.prisma.notificacionSalida.updateMany({
          where: { id: fila.id, estado: 'Pendiente', intentos: fila.intentos },
          data: {
            intentos: { increment: 1 },
            proximoIntentoAt: new Date(ahora.getTime() + leaseMs),
          },
        });
        if (reclamada.count === 0) continue;

        const intentos = fila.intentos + 1;
        const resultado = await this.procesarFila(fila, intentos, maxIntentos, baseSegundos, ahora);
        resumen[resultado] += 1;
      }

      return resumen;
    });
  }

  private async procesarFila(
    fila: NotificacionSalida,
    intentos: number,
    maxIntentos: number,
    baseSegundos: number,
    ahora: Date,
  ): Promise<'enviados' | 'fallidos' | 'descartados' | 'pendientes'> {
    const payload = (fila.payload ?? {}) as PayloadSalida;
    const destinatario = await this.resolverDestinatario(fila);
    if (!destinatario) {
      await this.descartar(fila.id, 'Sin correo destino para el envío.');
      return 'descartados';
    }

    if (this.aplicaListaPermitidos() && !this.estaPermitido(destinatario)) {
      await this.descartar(
        fila.id,
        `Destinatario fuera de CORREO_DESTINATARIOS_PERMITIDOS (${destinatario}).`,
      );
      return 'descartados';
    }

    try {
      await this.correo.enviar({
        destinatario,
        asunto: payload.asunto ?? '[SIAC] Notificación',
        textoPlano: payload.textoPlano ?? payload.mensaje ?? '',
        textoHtml: payload.textoHtml,
      });
      await this.prisma.notificacionSalida.update({
        where: { id: fila.id },
        data: { estado: 'Enviado', enviadoAt: ahora, ultimoError: null },
      });
      return 'enviados';
    } catch (error) {
      const motivo = recortar((error as Error)?.message ?? String(error));
      if (intentos >= maxIntentos) {
        await this.prisma.notificacionSalida.update({
          where: { id: fila.id },
          data: { estado: 'Fallido', ultimoError: motivo },
        });
        this.logger.error(
          `Correo ${fila.id} (${fila.tipo}) falló tras ${intentos} intentos: ${motivo}`,
        );
        return 'fallidos';
      }
      // Backoff base·2^(n-1): primer reintento tras la base, luego se duplica.
      const esperaMs = baseSegundos * 1000 * 2 ** (intentos - 1);
      await this.prisma.notificacionSalida.update({
        where: { id: fila.id },
        data: {
          ultimoError: motivo,
          proximoIntentoAt: new Date(ahora.getTime() + esperaMs),
        },
      });
      return 'pendientes';
    }
  }

  private async descartar(id: string, motivo: string): Promise<void> {
    await this.prisma.notificacionSalida.update({
      where: { id },
      data: { estado: 'Descartado', ultimoError: recortar(motivo) },
    });
    this.logger.warn(`Correo ${id} descartado: ${motivo}`);
  }

  private async resolverDestinatario(fila: NotificacionSalida): Promise<string | null> {
    const directo = fila.destinatarioCorreo?.trim().toLowerCase();
    if (directo) return directo;
    if (!fila.usuarioId) return null;
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: fila.usuarioId },
      select: { correo: true },
    });
    const correo = usuario?.correo?.trim().toLowerCase();
    return correo && correo.length > 0 ? correo : null;
  }

  private aplicaListaPermitidos(): boolean {
    const entorno =
      this.config.get<string>('nodeEnv') ?? process.env.NODE_ENV ?? 'development';
    return entorno !== 'production';
  }

  private estaPermitido(destinatario: string): boolean {
    return destinatarioPermitidoEnDesarrollo(
      this.config.get<string>('correoDestinatariosPermitidos') ??
        process.env.CORREO_DESTINATARIOS_PERMITIDOS,
      destinatario,
    );
  }

  private maxIntentos(): number {
    const valor =
      this.config.get<number>('correoMaxIntentos') ??
      parseInt(process.env.CORREO_MAX_INTENTOS ?? '3', 10);
    return Number.isFinite(valor) && valor >= 1 ? valor : 3;
  }

  private reintentoBaseSegundos(): number {
    const valor =
      this.config.get<number>('correoReintentoBaseSegundos') ??
      parseInt(process.env.CORREO_REINTENTO_BASE_SEGUNDOS ?? '30', 10);
    return Number.isFinite(valor) && valor >= 1 ? valor : 30;
  }

  /** Tiempo que una fila reclamada queda reservada antes de poder reintentarse (5 min). */
  private leaseSegundos(): number {
    const valor =
      this.config.get<number>('correoLeaseSegundos') ??
      parseInt(process.env.CORREO_LEASE_SEGUNDOS ?? '300', 10);
    return Number.isFinite(valor) && valor >= 1 ? valor : 300;
  }
}

function recortar(texto: string): string {
  return texto.length > 500 ? `${texto.slice(0, 497)}...` : texto;
}
