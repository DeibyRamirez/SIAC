import { BANDERA_SETUP_REMOTO, evaluarGuardaSetup } from './guarda-setup';

describe('evaluarGuardaSetup (pnpm prisma:setup)', () => {
  const LOCAL = 'postgresql://postgres:postgres@localhost:5433/siac';
  const REMOTA = 'postgresql://usuario:clave@aws-0-ca-central-1.pooler.supabase.com:6543/postgres';

  it.each([
    ['localhost', LOCAL],
    ['127.0.0.1', 'postgresql://postgres@127.0.0.1:55440/siac'],
    ['servicio postgres de CI', 'postgresql://postgres:postgres@postgres:5432/siac'],
  ])('permite una BD local (%s)', (_caso, url) => {
    expect(evaluarGuardaSetup({ DATABASE_URL: url, DIRECT_URL: url }).permitido).toBe(true);
  });

  it('rechaza una BD remota (Supabase) sin la bandera explícita', () => {
    const resultado = evaluarGuardaSetup({ DATABASE_URL: REMOTA });
    expect(resultado.permitido).toBe(false);
    expect(resultado.motivo).toMatch(/pooler\.supabase\.com/);
    expect(resultado.motivo).toMatch(BANDERA_SETUP_REMOTO);
    expect(resultado.motivo).not.toMatch(/clave/);
  });

  it('rechaza si DIRECT_URL (la de migrate) es remota aunque DATABASE_URL sea local', () => {
    expect(evaluarGuardaSetup({ DATABASE_URL: LOCAL, DIRECT_URL: REMOTA }).permitido).toBe(false);
  });

  it('rechaza si falta DATABASE_URL o no es una URL válida', () => {
    expect(evaluarGuardaSetup({}).permitido).toBe(false);
    expect(evaluarGuardaSetup({ DATABASE_URL: 'no-es-url' }).permitido).toBe(false);
  });

  it('permite una BD remota solo con SIAC_PERMITIR_SETUP_REMOTO=true', () => {
    expect(evaluarGuardaSetup({ DATABASE_URL: REMOTA, [BANDERA_SETUP_REMOTO]: 'true' }).permitido).toBe(true);
    expect(evaluarGuardaSetup({ DATABASE_URL: REMOTA, [BANDERA_SETUP_REMOTO]: '1' }).permitido).toBe(false);
  });
});
