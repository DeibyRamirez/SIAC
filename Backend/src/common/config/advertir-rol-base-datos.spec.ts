import { advertirRolAplicacionBaseDatos } from './advertir-rol-base-datos';

describe('advertirRolAplicacionBaseDatos', () => {
  it('advierte si el rol es superusuario', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        { rolname: 'siac_app', rolsuper: false, rolbypassrls: false },
      ]),
    };
    process.env.DATABASE_URL = 'postgresql://postgres:xxx@localhost:5432/siac';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await advertirRolAplicacionBaseDatos(prisma as never);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('dueño postgres'));
    warn.mockRestore();
  });

  it('advierte si el rol tiene BYPASSRLS', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        { rolname: 'postgres', rolsuper: true, rolbypassrls: true },
      ]),
    };
    process.env.DATABASE_URL = 'postgresql://postgres@localhost:5432/siac';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await advertirRolAplicacionBaseDatos(prisma as never);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('superusuario'));
    warn.mockRestore();
  });
});
