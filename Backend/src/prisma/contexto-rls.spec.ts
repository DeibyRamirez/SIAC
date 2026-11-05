import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { RolUsuario } from '@prisma/client';
import {
  contextoRlsActual,
  ejecutarConContexto,
  ejecutarConContextoVacio,
  fijarUsuarioEnContexto,
} from './contexto-rls';
import { ejecutarComoSistema, ejecutarComoSistemaEnTransaccion } from './contexto-sistema';
import { extenderClienteConRls } from './prisma.module';
import { sentenciaContextoRls } from './sentencia-contexto-rls';

interface DefinicionExtension {
  query: {
    $allOperations(p: { args: unknown; query: (a: unknown) => Promise<unknown> }): Promise<unknown>;
  };
}

/** Cliente falso: registra lotes y transacciones como lo haría Prisma, sin BD. */
function crearClienteFalso() {
  const lotes: unknown[][] = [];
  const sentenciasTx: unknown[] = [];
  const tx = {
    $executeRaw: jest.fn(async (sql: unknown) => {
      sentenciasTx.push(sql);
      return 1;
    }),
  };
  const base = {
    $executeRaw: (sql: unknown) => ({ contexto: sql }),
    $transaction: jest.fn(async (entrada: unknown) => {
      if (Array.isArray(entrada)) {
        lotes.push(entrada);
        return Promise.all(entrada.map((x) => (x && typeof x === 'object' && 'contexto' in x ? 1 : x)));
      }
      return (entrada as (t: typeof tx) => Promise<unknown>)(tx);
    }),
    $extends(def: DefinicionExtension) {
      return {
        usuario: {
          findMany: (args: unknown) =>
            def.query.$allOperations({ args, query: async () => ['fila'] }),
        },
        $transaction: base.$transaction,
      };
    },
  };
  const cliente = extenderClienteConRls(base as never) as unknown as {
    usuario: { findMany(a?: unknown): Promise<unknown> };
    $transaction(e: unknown): Promise<unknown>;
  };
  return { cliente, base, tx, lotes, sentenciasTx };
}

describe('contexto de RLS por transacción (plan-rls.md §3.2)', () => {
  it('sin contexto no fija nada: la consulta va directa y la RLS no devuelve filas', async () => {
    const { cliente, base } = crearClienteFalso();
    await expect(cliente.usuario.findMany()).resolves.toEqual(['fila']);
    expect(base.$transaction).not.toHaveBeenCalled();
  });

  it('con usuario, cada operación corre en un lote que primero ejecuta set_config local', async () => {
    const { cliente, lotes } = crearClienteFalso();
    await ejecutarConContextoVacio(async () => {
      fijarUsuarioEnContexto('u-1', RolUsuario.Revisor);
      await expect(cliente.usuario.findMany()).resolves.toEqual(['fila']);
    });
    expect(lotes).toHaveLength(1);
    const sql = (lotes[0][0] as { contexto: { sql: string; values: unknown[] } }).contexto;
    expect(sql.sql).toContain("set_config('app.usuario_id', ?, true)");
    expect(sql.sql).toContain("set_config('app.rol', ?, true)");
    expect(sql.values).toEqual(['u-1', 'Revisor']);
  });

  it('transacción interactiva: fija el contexto una vez en la misma conexión y no anida lotes', async () => {
    const { cliente, lotes, sentenciasTx } = crearClienteFalso();
    await ejecutarConContextoVacio(async () => {
      fijarUsuarioEnContexto('u-2', RolUsuario.Cargador);
      await cliente.$transaction(async () => {
        expect(contextoRlsActual()).toMatchObject({ usuarioId: 'u-2', enTransaccion: true });
        await cliente.usuario.findMany();
      });
    });
    expect(sentenciasTx).toHaveLength(1);
    expect(lotes).toHaveLength(0);
  });

  it('el rol sistema no puede venir de un JWT: fijarUsuarioEnContexto solo acepta RolUsuario', () => {
    ejecutarConContextoVacio(() => {
      expect(() => fijarUsuarioEnContexto('x', 'sistema' as RolUsuario)).toThrow(/Rol no válido/);
    });
  });

  it('ejecutarComoSistema aísla el contexto y no contamina la petición que lo llamó', async () => {
    await ejecutarConContextoVacio(async () => {
      fijarUsuarioEnContexto('u-3', RolUsuario.Administrador);
      await ejecutarComoSistema(async () => {
        expect(contextoRlsActual()).toEqual({ usuarioId: 'sistema', rol: 'sistema' });
      });
      expect(contextoRlsActual()).toEqual({ usuarioId: 'u-3', rol: RolUsuario.Administrador });
    });
  });

  it('en una transacción abierta eleva a sistema y restaura el contexto anterior', async () => {
    const tx = { $executeRaw: jest.fn().mockResolvedValue(1) };
    await ejecutarConContexto({ usuarioId: 'u-4', rol: RolUsuario.Revisor }, () =>
      ejecutarComoSistemaEnTransaccion(tx, async () => 'ok'),
    );
    const valores = tx.$executeRaw.mock.calls.map((c) => (c[0] as { values: unknown[] }).values);
    expect(valores).toEqual([
      ['sistema', 'sistema'],
      ['u-4', 'Revisor'],
    ]);
  });

  it('la sentencia usa parámetros (nunca concatena el id ni el rol)', () => {
    const sql = sentenciaContextoRls({ usuarioId: "x'; DROP TABLE x; --", rol: RolUsuario.Cargador });
    expect(sql.sql).not.toContain('DROP');
    expect(sql.values).toEqual(["x'; DROP TABLE x; --", 'Cargador']);
  });

  it("solo src/prisma/contexto-sistema.ts fija el rol 'sistema'", () => {
    const raiz = join(__dirname, '..');
    const archivos: string[] = [];
    const recorrer = (dir: string) => {
      for (const nombre of readdirSync(dir)) {
        const ruta = join(dir, nombre);
        if (statSync(ruta).isDirectory()) recorrer(ruta);
        else if (ruta.endsWith('.ts') && !ruta.endsWith('.spec.ts')) archivos.push(ruta);
      }
    };
    recorrer(raiz);
    const infractores = archivos.filter((ruta) => {
      if (ruta.endsWith(join('prisma', 'contexto-sistema.ts'))) return false;
      return /rol:\s*'sistema'|app\.rol[^\n]*sistema/.test(readFileSync(ruta, 'utf8'));
    });
    expect(infractores).toEqual([]);
  });
});
