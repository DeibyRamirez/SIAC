import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Cobertura de RLS (plan-rls.md §6): toda tabla de schema.prisma tiene ENABLE + FORCE ROW LEVEL
 * SECURITY y al menos una política para siac_app en alguna migración. Si se agrega un modelo
 * sin su RLS, esta prueba falla. Excluida: _prisma_migrations (no es un modelo).
 */
describe('cobertura de RLS en las migraciones', () => {
  const backend = join(__dirname, '..', '..');
  const esquema = readFileSync(join(backend, 'prisma', 'schema.prisma'), 'utf8');
  const modelos = [...esquema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]);
  const carpeta = join(backend, 'prisma', 'migrations');
  const sql = readdirSync(carpeta)
    .filter((d) => !d.endsWith('.toml'))
    .map((d) => readFileSync(join(carpeta, d, 'migration.sql'), 'utf8'))
    .join('\n');

  it('el esquema tiene las 22 tablas del plan', () => {
    expect(modelos).toHaveLength(22);
  });

  it.each(modelos)('%s: ENABLE + FORCE ROW LEVEL SECURITY y políticas para siac_app', (modelo) => {
    expect(sql).toContain(`ALTER TABLE "${modelo}" ENABLE ROW LEVEL SECURITY;`);
    expect(sql).toContain(`ALTER TABLE "${modelo}" FORCE ROW LEVEL SECURITY;`);
    expect(sql).toMatch(new RegExp(`CREATE POLICY "\\w+" ON "${modelo}" AS PERMISSIVE FOR \\w+ TO siac_app`));
  });

  it('siac_app y siac_powerbi_lectura se crean sin BYPASSRLS, sin contraseña y de forma idempotente', () => {
    expect(sql).toMatch(/IF NOT EXISTS \(SELECT 1 FROM pg_roles WHERE rolname = 'siac_app'\)/);
    expect(sql).toMatch(/CREATE ROLE siac_app NOLOGIN[^;]*NOBYPASSRLS/);
    expect(sql).toMatch(/CREATE ROLE siac_powerbi_lectura NOLOGIN[^;]*NOBYPASSRLS/);
    expect(sql).not.toMatch(/PASSWORD\s+'/i);
  });

  it('las borradores solo los ve su autor también en la política de Evidencia', () => {
    expect(sql).toMatch(/p_estado <> 'Borrador' OR p_autor = siac\.usuario_id\(\)/);
  });

  it('la revocación de anon/authenticated está protegida para entornos sin esos roles', () => {
    expect(sql).toMatch(/FOREACH r IN ARRAY ARRAY\['anon', 'authenticated'\]/);
    expect(sql).toMatch(/IF EXISTS \(SELECT 1 FROM pg_roles WHERE rolname = r\)/);
  });
});
