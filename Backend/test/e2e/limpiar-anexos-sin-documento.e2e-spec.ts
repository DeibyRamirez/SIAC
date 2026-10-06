import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { verificarBaseDeDatosDesechable } from '../utilidades/app-e2e';
import { aCsv, limpiarAnexosSinDocumento } from '../../prisma/scripts/limpiar-anexos-sin-documento';

/**
 * Script explícito de limpieza (decisión del PO, 06/10): respalda en JSON/CSV, borra los
 * AnexoVigencia sin documento, informa el conteo y es idempotente. Solo contra la BD local/CI.
 */
describe('pnpm datos:limpiar-anexos-sin-documento', () => {
  const prisma = new PrismaClient();
  let salida: string;
  const silenciar = jest.spyOn(console, 'log').mockImplementation(() => undefined);

  beforeAll(async () => {
    verificarBaseDeDatosDesechable();
    salida = mkdtempSync(join(tmpdir(), 'siac-respaldo-anexos-'));
    await prisma.anexoVigencia.deleteMany({ where: { programaId: 'prog-e2e-limpieza' } });
    await prisma.programa.deleteMany({ where: { id: 'prog-e2e-limpieza' } });
    await prisma.programa.create({
      data: { id: 'prog-e2e-limpieza', nombre: 'Programa limpieza', codigo: 'E2E-LIMP', slug: 'e2e-limpieza', nivel: 'Pregrado' },
    });
    const base = { programaId: 'prog-e2e-limpieza', tipo: 'Infraestructura', responsable: 'admin', fechaVencimiento: new Date('2027-01-01') };
    await prisma.anexoVigencia.createMany({
      data: [
        { ...base, id: 'anx-e2e-sin-1', titulo: 'Semilla antigua 1' },
        { ...base, id: 'anx-e2e-sin-2', titulo: 'Semilla antigua 2, con "comillas"', rutaArchivo: '' },
        { ...base, id: 'anx-e2e-con', titulo: 'Con archivo', rutaArchivo: 'documentos/general/u/a.pdf', nombreArchivo: 'a.pdf' },
      ],
    });
  });

  afterAll(async () => {
    await prisma.anexoVigencia.deleteMany({ where: { programaId: 'prog-e2e-limpieza' } });
    await prisma.programa.deleteMany({ where: { id: 'prog-e2e-limpieza' } });
    await prisma.$disconnect();
    rmSync(salida, { recursive: true, force: true });
    silenciar.mockRestore();
  });

  it('sin --ejecutar solo respalda y cuenta', async () => {
    const resultado = await limpiarAnexosSinDocumento(prisma, { ejecutar: false, salida, permitirBdRemota: false });
    expect(resultado).toMatchObject({ encontradas: 2, borradas: 0, restantes: 2 });
    expect(existsSync(resultado.respaldo!.json)).toBe(true);
  });

  it('con --ejecutar respalda en JSON/CSV, borra solo los sin documento y deja 0', async () => {
    const resultado = await limpiarAnexosSinDocumento(prisma, { ejecutar: true, salida, permitirBdRemota: false });
    expect(resultado).toMatchObject({ encontradas: 2, borradas: 2, restantes: 0 });

    const json = JSON.parse(readFileSync(resultado.respaldo!.json, 'utf8')) as { id: string }[];
    expect(json.map((f) => f.id).sort()).toEqual(['anx-e2e-sin-1', 'anx-e2e-sin-2']);
    expect(readFileSync(resultado.respaldo!.csv, 'utf8')).toContain('"Semilla antigua 2, con ""comillas"""');

    const [{ sin_documento }] = await prisma.$queryRaw<{ sin_documento: bigint }[]>`
      SELECT count(*) AS sin_documento FROM "AnexoVigencia" WHERE "rutaArchivo" IS NULL OR "rutaArchivo" = ''`;
    expect(Number(sin_documento)).toBe(0);
    expect(await prisma.anexoVigencia.findUnique({ where: { id: 'anx-e2e-con' } })).not.toBeNull();
  });

  it('es idempotente: la segunda ejecución no borra nada ni crea respaldo', async () => {
    const resultado = await limpiarAnexosSinDocumento(prisma, { ejecutar: true, salida, permitirBdRemota: false });
    expect(resultado).toMatchObject({ encontradas: 0, borradas: 0, restantes: 0, respaldo: null });
  });

  it('aCsv escapa comillas y fechas', () => {
    expect(aCsv([{ a: 'x"y', b: new Date('2026-10-06T00:00:00Z'), c: null }])).toBe(
      'a,b,c\n"x""y","2026-10-06T00:00:00.000Z",""\n',
    );
  });
});
