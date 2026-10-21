import { RolUsuario } from '@prisma/client';
import { idsGestionYRevisores, PrismaDestinatarios } from './destinatarios-alertas';

function crearPrisma(gestion: string[], revisores: string[]) {
  const findMany = jest.fn(async (args: { where: Record<string, unknown> }) => {
    const rol = args.where.rol;
    const ids = rol === RolUsuario.Revisor ? revisores : gestion;
    return ids.map((id) => ({ id }));
  });
  return { prisma: { usuario: { findMany } } as unknown as PrismaDestinatarios, findMany };
}

describe('idsGestionYRevisores', () => {
  it('une Administrador/SuperAdmin activos con los Revisores activos del programa', async () => {
    const { prisma, findMany } = crearPrisma(['admin', 'super'], ['rev-1']);

    await expect(idsGestionYRevisores(prisma, 'p1')).resolves.toEqual(['admin', 'super', 'rev-1']);

    expect(findMany).toHaveBeenNthCalledWith(1, {
      where: { activo: true, rol: { in: [RolUsuario.Administrador, RolUsuario.SuperAdmin] } },
      select: { id: true },
    });
    expect(findMany).toHaveBeenNthCalledWith(2, {
      where: { activo: true, rol: RolUsuario.Revisor, usuarioProgramas: { some: { programaId: 'p1' } } },
      select: { id: true },
    });
  });

  it('sin programa (institucional) avisa a todos los Revisores activos', async () => {
    const { prisma, findMany } = crearPrisma(['admin'], ['rev-1', 'rev-2']);

    await expect(idsGestionYRevisores(prisma, null)).resolves.toEqual(['admin', 'rev-1', 'rev-2']);
    expect(findMany).toHaveBeenNthCalledWith(2, {
      where: { activo: true, rol: RolUsuario.Revisor },
      select: { id: true },
    });
  });

  it('no repite ids y nunca consulta roles fuera de gestión y revisión', async () => {
    const { prisma, findMany } = crearPrisma(['admin', 'admin'], ['admin']);

    await expect(idsGestionYRevisores(prisma, 'p1')).resolves.toEqual(['admin']);
    const roles = JSON.stringify(findMany.mock.calls.map((c) => c[0].where.rol));
    expect(roles).not.toMatch(/ParAcademico|Cargador/);
  });
});
