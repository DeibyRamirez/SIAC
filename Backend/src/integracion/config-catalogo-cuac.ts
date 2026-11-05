import { ConfigService } from '@nestjs/config';

type FuenteConfig = ConfigService | NodeJS.ProcessEnv;

function leerEnv(fuente: FuenteConfig, clave: string): string | undefined {
  if (fuente instanceof ConfigService) {
    return fuente.get<string>(clave);
  }
  return fuente[clave];
}

/**
 * Controla la sincronización automática y manual del catálogo CUAC.
 * - `CARRERAS_SYNC_HABILITADO=false` la desactiva.
 * - En `NODE_ENV=test` queda desactivada salvo que se fuerce `true`.
 */
export function esSincronizacionCuacHabilitada(fuente: FuenteConfig = process.env): boolean {
  const raw = leerEnv(fuente, 'CARRERAS_SYNC_HABILITADO')?.trim().toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'no') return false;
  if (raw === 'true' || raw === '1' || raw === 'si' || raw === 'sí') return true;

  const nodeEnv = leerEnv(fuente, 'NODE_ENV')?.trim().toLowerCase();
  if (nodeEnv === 'test') return false;

  return true;
}
