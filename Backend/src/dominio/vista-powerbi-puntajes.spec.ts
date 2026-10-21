import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * T-009.1: garantías estáticas de la migración de la vista (la consulta real se prueba en
 * test/e2e/vista-powerbi-puntajes.e2e-spec.ts contra PostgreSQL en CI).
 */
describe('migración v_powerbi_puntajes', () => {
  const carpeta = join(__dirname, '..', '..', 'prisma', 'migrations');
  const migracion = readdirSync(carpeta).find((d) => d.endsWith('_vista_powerbi_puntajes'));
  const sql = migracion ? readFileSync(join(carpeta, migracion, 'migration.sql'), 'utf8') : '';
  const select = sql.slice(sql.indexOf('CREATE OR REPLACE VIEW'));
  const columnas = [...select.matchAll(/AS "(\w+)"/g)].map((m) => m[1]);

  it('existe y crea la vista con security_invoker (respeta permisos y RLS de quien consulta)', () => {
    expect(migracion).toBeDefined();
    expect(sql).toMatch(/CREATE OR REPLACE VIEW "v_powerbi_puntajes"\s+WITH \(security_invoker = true\)/);
  });

  it('expone programa, guía, puntaje n/9 o n/6, estado, condiciones y semáforo de vigencia', () => {
    expect(columnas).toEqual(
      expect.arrayContaining([
        'programa',
        'codigoGuia',
        'puntaje',
        'totalCondiciones',
        'puntajeTexto',
        'estado',
        'condicionesCumplidas',
        'condicionesNoCumplidas',
        'semaforoVigencia',
      ]),
    );
    expect(sql).toMatch(/"codigoGuia" IN \('G1', 'G3'\)/);
    expect(sql).toMatch(/WHEN 'G1' THEN 9 ELSE 6/);
  });

  it('no expone datos personales ni borradores', () => {
    expect(columnas.join(',')).not.toMatch(/autor|revisor|responsable|correo|observacion|ruta|archivo/i);
    expect(select).not.toMatch(/"Usuario"/);
    expect(sql).toMatch(/"estado" <> 'Borrador'/);
  });

  it('el semáforo usa los umbrales de ConfiguracionSIAC (por defecto 7 años, 12 y 6 meses)', () => {
    expect(sql).toMatch(/FROM "ConfiguracionSIAC"/);
    expect(sql).toMatch(/COALESCE\(MAX\("mesesAvisoVigencia"\), 12\)/);
    expect(sql).toMatch(/COALESCE\(MAX\("mesesRojoVigencia"\), 6\)/);
  });
});
