import { esHostDesechable, hostDeUrlBaseDatos } from './host-base-datos';

/** Bandera explícita para permitir `pnpm prisma:setup` contra una BD remota/compartida. */
export const BANDERA_SETUP_REMOTO = 'SIAC_PERMITIR_SETUP_REMOTO';

type VariablesEntorno = Record<string, string | undefined>;

export interface ResultadoGuardaSetup {
  permitido: boolean;
  motivo: string;
}

/**
 * Guarda de `pnpm prisma:setup` (migrate deploy + semilla + backfill): solo corre contra una
 * BD local/desechable (localhost, 127.0.0.1 o el servicio `postgres` de CI). Para cualquier
 * otro host (p. ej. Supabase) exige `SIAC_PERMITIR_SETUP_REMOTO=true` de forma explícita.
 * Revisa DATABASE_URL y, si existe, DIRECT_URL (la que usa `prisma migrate`).
 */
export function evaluarGuardaSetup(entorno: VariablesEntorno): ResultadoGuardaSetup {
  if (entorno[BANDERA_SETUP_REMOTO] === 'true') {
    return {
      permitido: true,
      motivo: `${BANDERA_SETUP_REMOTO}=true: se permite el setup contra la BD configurada.`,
    };
  }
  if (!entorno.DATABASE_URL?.trim()) {
    return { permitido: false, motivo: 'Falta DATABASE_URL: no se puede verificar el host de la BD.' };
  }
  const variables: Array<'DATABASE_URL' | 'DIRECT_URL'> = ['DATABASE_URL', 'DIRECT_URL'];
  for (const nombre of variables) {
    const url = entorno[nombre]?.trim();
    if (!url) continue;
    let host: string;
    try {
      host = hostDeUrlBaseDatos(url);
    } catch {
      return { permitido: false, motivo: `${nombre} no es una URL válida.` };
    }
    if (!esHostDesechable(host)) {
      return {
        permitido: false,
        motivo:
          `${nombre} apunta a un host no local (${host}). prisma:setup aplica migraciones y escribe ` +
          `semilla/backfill: úselo solo contra una BD local o declare ${BANDERA_SETUP_REMOTO}=true.`,
      };
    }
  }
  return { permitido: true, motivo: 'BD local/desechable.' };
}
