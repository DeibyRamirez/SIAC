import { Prisma } from '@prisma/client';
import { ContextoRls } from './contexto-rls';

/** Sentencia que fija el contexto de RLS solo para la transacción en curso (pgbouncer-safe). */
export function sentenciaContextoRls(contexto: ContextoRls): Prisma.Sql {
  return Prisma.sql`SELECT set_config('app.usuario_id', ${contexto.usuarioId ?? ''}, true), set_config('app.rol', ${contexto.rol ?? ''}, true)`;
}
