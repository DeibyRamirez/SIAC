import { PrismaClient } from '@prisma/client';
import { usuarioDeUrlBaseDatos } from './host-base-datos';

interface FilaRolPg {
  rolname: string;
  rolsuper: boolean;
  rolbypassrls: boolean;
}

/** Advertencia al arranque si DATABASE_URL no usa el rol de aplicación con RLS (solo log, sin credenciales). */
export async function advertirRolAplicacionBaseDatos(prisma: PrismaClient): Promise<void> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return;

  let usuario: string;
  try {
    usuario = usuarioDeUrlBaseDatos(url);
  } catch {
    return;
  }

  try {
    const filas = await prisma.$queryRaw<FilaRolPg[]>`
      SELECT rolname, rolsuper, rolbypassrls
      FROM pg_roles
      WHERE rolname = ${usuario}
      LIMIT 1
    `;
    if (filas.length === 0) {
      console.warn(
        `[configuración] No se encontró el rol PostgreSQL «${usuario}» de DATABASE_URL; verifique el usuario de conexión (se espera siac_app en producción).`,
      );
      return;
    }
    const rol = filas[0];
    if (rol.rolsuper) {
    console.warn(
      '[configuración] DATABASE_URL usa un rol superusuario: Row Level Security no se aplica. Conecte la API con el rol siac_app (véase docs/despliegue-docker.md).',
    );
    } else if (rol.rolbypassrls) {
      console.warn(
        '[configuración] DATABASE_URL usa un rol con BYPASSRLS: Row Level Security no se aplica. Conecte la API con el rol siac_app.',
      );
    } else if (usuario === 'postgres' || usuario.startsWith('postgres.')) {
      console.warn(
        '[configuración] DATABASE_URL usa el dueño postgres: en producción la API debe usar siac_app para que RLS aplique.',
      );
    }
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    console.warn(
      `[configuración] No se pudo comprobar privilegios del rol de DATABASE_URL (${detalle}).`,
    );
  }
}
