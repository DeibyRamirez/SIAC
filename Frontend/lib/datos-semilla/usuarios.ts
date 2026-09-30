import type { Usuario } from '@/lib/tipos'

export const DOMINIO_INSTITUCIONAL = 'uniautonoma.edu.co'

/** Espejo de `Backend/prisma/semilla.ts`: un usuario por rol (credenciales de acceso inicial). */
export const usuariosSemilla: Usuario[] = [
  {
    id: 'usr-cargador',
    nombre: 'María Cortés',
    correo: 'maria.cargadora@uniautonoma.edu.co',
    contrasena: 'Cargador2026',
    rol: 'Cargador',
  },
  {
    id: 'usr-revisor',
    nombre: 'Laura Ramírez',
    correo: 'revisor.calidad@uniautonoma.edu.co',
    contrasena: 'Revisor2026',
    rol: 'Revisor',
  },
  {
    id: 'usr-admin',
    nombre: 'Oscar Alvarado',
    correo: 'admin.planeacion@uniautonoma.edu.co',
    contrasena: 'Admin2026',
    rol: 'Administrador',
  },
  {
    id: 'usr-par',
    nombre: 'Carlos Méndez',
    correo: 'par.academico@uniautonoma.edu.co',
    contrasena: 'Par2026',
    rol: 'ParAcademico',
  },
  {
    id: 'usr-superadmin',
    nombre: 'Ana SuperAdmin',
    correo: 'superadmin@uniautonoma.edu.co',
    contrasena: 'SuperAdmin2026',
    rol: 'SuperAdmin',
  },
]
