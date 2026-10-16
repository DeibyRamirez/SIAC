import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

/** Tiempo máximo del ping a la base de datos (el health check de Render espera ~5 s). */
export const LIMITE_PING_BD_MS = 3000;

export interface EstadoSalud {
  estado: 'ok' | 'degradado';
  baseDatos: 'ok' | 'sin_conexion';
  latenciaBdMs: number | null;
  marcaTiempo: string;
}

@Injectable()
export class SaludService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ejecuta `SELECT 1` con límite de tiempo para no colgar el health check. */
  async consultar(limiteMs = LIMITE_PING_BD_MS): Promise<EstadoSalud> {
    const inicio = Date.now();
    let temporizador: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, rechazar) => {
          temporizador = setTimeout(
            () => rechazar(new Error('Tiempo de espera agotado en el ping a la BD')),
            limiteMs,
          );
        }),
      ]);
      return {
        estado: 'ok',
        baseDatos: 'ok',
        latenciaBdMs: Date.now() - inicio,
        marcaTiempo: new Date().toISOString(),
      };
    } catch {
      return {
        estado: 'degradado',
        baseDatos: 'sin_conexion',
        latenciaBdMs: null,
        marcaTiempo: new Date().toISOString(),
      };
    } finally {
      if (temporizador) clearTimeout(temporizador);
    }
  }
}
