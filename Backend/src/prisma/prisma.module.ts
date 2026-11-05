import { Global, Injectable, Module, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { contextoRlsActual, ContextoRls, ejecutarConContexto } from './contexto-rls';
import { sentenciaContextoRls } from './sentencia-contexto-rls';

export { sentenciaContextoRls };

function requiereContexto(contexto: ContextoRls | undefined): contexto is ContextoRls {
  return Boolean(contexto?.rol) && !contexto?.enTransaccion;
}

/**
 * Envuelve el cliente para que cada operación corra en una transacción que primero ejecuta
 * set_config(..., true). Con `is_local = true` el valor muere con la transacción, así que no se
 * filtra a otra petición que reutilice la conexión del pool (pgbouncer en transaction mode).
 */
export function extenderClienteConRls<T extends PrismaClient>(base: T): T {
  const extendido = base.$extends({
    query: {
      async $allOperations({ args, query }) {
        const contexto = contextoRlsActual();
        if (!requiereContexto(contexto)) return query(args);
        const [, resultado] = await base.$transaction([
          base.$executeRaw(sentenciaContextoRls(contexto)),
          query(args) as Prisma.PrismaPromise<unknown>,
        ]);
        return resultado;
      },
    },
  });

  const transaccion = (entrada: unknown, opciones?: unknown): Promise<unknown> => {
    const contexto = contextoRlsActual();
    const original = extendido.$transaction.bind(extendido) as (a: unknown, b?: unknown) => Promise<unknown>;
    if (!requiereContexto(contexto)) return original(entrada, opciones);
    const dentro: ContextoRls = { ...contexto, enTransaccion: true };

    if (typeof entrada === 'function') {
      // Transacción interactiva: el contexto se fija una vez, al inicio, en la misma conexión.
      return original(
        (tx: PrismaClient) =>
          ejecutarConContexto(dentro, async () => {
            await tx.$executeRaw(sentenciaContextoRls(contexto));
            return (entrada as (t: PrismaClient) => Promise<unknown>)(tx);
          }),
        opciones,
      );
    }
    // Lote: la sentencia de contexto va primero dentro del mismo lote.
    const lote = entrada as Prisma.PrismaPromise<unknown>[];
    return ejecutarConContexto(dentro, async () => {
      const resultados = (await base.$transaction(
        [base.$executeRaw(sentenciaContextoRls(contexto)), ...lote],
        opciones as never,
      )) as unknown[];
      return resultados.slice(1);
    });
  };

  return new Proxy(extendido, {
    get(objetivo, propiedad, receptor) {
      if (propiedad === '$transaction') return transaccion;
      return Reflect.get(objetivo, propiedad, receptor);
    },
  }) as unknown as T;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super();
    // Nest recibe el cliente extendido con RLS; los tipos siguen siendo los de PrismaClient.
    return extenderClienteConRls(this);
  }

  async onModuleInit() {
    await this.$connect();
  }
}

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
