import { contextoRlsActual, ejecutarConContexto } from './contexto-rls';
import { sentenciaContextoRls } from './sentencia-contexto-rls';

/**
 * Ruta de sistema de la RLS (plan-rls.md §3.3): el ÚNICO lugar que fija app.rol = 'sistema'.
 * La usan los procesos que no actúan en nombre de un usuario o que escriben filas de otros:
 * cron de vigencias, procesador del outbox, despacho de alertas, cálculo de avance, ingesta y
 * carga de configuración. src/prisma/contexto-sistema.spec.ts verifica que 'sistema' no se use
 * en ningún otro archivo.
 */
export function ejecutarComoSistema<T>(fn: () => Promise<T>): Promise<T> {
  return ejecutarConContexto({ usuarioId: 'sistema', rol: 'sistema' }, fn);
}

/** Cliente mínimo para fijar el contexto dentro de una transacción ya abierta. */
interface ClienteSql {
  $executeRaw(consulta: import('@prisma/client').Prisma.Sql): Promise<number>;
}

/**
 * Igual que ejecutarComoSistema, pero dentro de una transacción de negocio ya abierta (`tx`):
 * eleva la transacción a 'sistema' solo durante `fn` y después restaura el contexto anterior.
 */
export async function ejecutarComoSistemaEnTransaccion<T>(
  tx: ClienteSql,
  fn: () => Promise<T>,
): Promise<T> {
  const anterior = contextoRlsActual();
  await tx.$executeRaw(sentenciaContextoRls({ usuarioId: 'sistema', rol: 'sistema' }));
  try {
    return await fn();
  } finally {
    await tx.$executeRaw(sentenciaContextoRls(anterior ?? {}));
  }
}
