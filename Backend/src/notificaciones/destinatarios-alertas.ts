import { RolUsuario } from '@prisma/client';

/** Subconjunto de Prisma que necesita el cálculo de destinatarios (facilita las pruebas). */
export interface PrismaDestinatarios {
  usuario: {
    findMany(args: {
      where: Record<string, unknown>;
      select: { id: true };
    }): Promise<Array<{ id: string }>>;
  };
}

/**
 * Destinatarios de las alertas de gestión (vigencia de registro, anexos D-1 y avance):
 * Administradores y SuperAdmin activos más los Revisores activos asignados al programa.
 * Sin programa (alcance institucional) se avisa a todos los Revisores activos.
 * El rol Par académico ya no existe (HU-011), así que nunca forma parte de la lista.
 * Devuelve ids únicos, en orden estable: primero gestión y después revisores.
 */
export async function idsGestionYRevisores(
  prisma: PrismaDestinatarios,
  programaId?: string | null,
): Promise<string[]> {
  const gestion = await prisma.usuario.findMany({
    where: {
      activo: true,
      rol: { in: [RolUsuario.Administrador, RolUsuario.SuperAdmin] },
    },
    select: { id: true },
  });

  const revisores = await prisma.usuario.findMany({
    where: programaId
      ? { activo: true, rol: RolUsuario.Revisor, usuarioProgramas: { some: { programaId } } }
      : { activo: true, rol: RolUsuario.Revisor },
    select: { id: true },
  });

  return [...new Set([...gestion, ...revisores].map((u) => u.id))];
}
