/**
 * Semilla mínima: solo un usuario por rol para poder iniciar sesión.
 * Programas, estructura, vigencias, evidencias y plantillas se crean desde la app
 * (o por CSV / Supabase Storage). El catálogo de trámites SIAC y la institución CUAC
 * los insertan las migraciones.
 */
import { PrismaClient, RolUsuario, OrigenDato } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();

const USUARIOS_SEMILLA: Array<{
  nombre: string;
  correo: string;
  clave: string;
  rol: RolUsuario;
  cargo: string;
  dependencia: string;
}> = [
  {
    nombre: 'María Cortés',
    correo: 'maria.cargadora@uniautonoma.edu.co',
    clave: 'Cargador2026',
    rol: RolUsuario.Cargador,
    cargo: 'Docente',
    dependencia: 'Ingeniería de Sistemas',
  },
  {
    nombre: 'Laura Ramírez',
    correo: 'revisor.calidad@uniautonoma.edu.co',
    clave: 'Revisor2026',
    rol: RolUsuario.Revisor,
    cargo: 'Profesional de Planeación',
    dependencia: 'Planeación',
  },
  {
    nombre: 'Oscar Alvarado',
    correo: 'admin.planeacion@uniautonoma.edu.co',
    clave: 'Admin2026',
    rol: RolUsuario.Administrador,
    cargo: 'Director de Planeación',
    dependencia: 'Planeación',
  },
  {
    nombre: 'Carlos Méndez',
    correo: 'par.academico@uniautonoma.edu.co',
    clave: 'Par2026',
    rol: RolUsuario.ParAcademico,
    cargo: 'Par Académico MEN',
    dependencia: 'Externo',
  },
  {
    nombre: 'Ana SuperAdmin',
    correo: 'superadmin@uniautonoma.edu.co',
    clave: 'SuperAdmin2026',
    rol: RolUsuario.SuperAdmin,
    cargo: 'Super Administrador TI',
    dependencia: 'Planeación',
  },
];

async function main() {
  console.log('Sembrando usuarios SIAC (uno por rol)...');

  for (const { clave, ...datos } of USUARIOS_SEMILLA) {
    const contrasena = await bcrypt.hash(clave, 10);
    await prisma.usuario.upsert({
      where: { correo: datos.correo },
      update: {},
      create: { ...datos, contrasena, origenDato: OrigenDato.Manual },
    });
  }

  // T-010.2: umbrales vigentes del semáforo (la migración ya inserta la fila; esto la asegura).
  await prisma.configuracionSIAC.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      avanceMinimoVerde: 100,
      avanceMinimoAmarillo: 55,
      aniosVigencia: 7,
      mesesAvisoVigencia: 12,
    },
  });

  // HU-009: diccionario de variables de cifras institucionales (8 categorías).
  const rutaVariables = join(__dirname, 'datos', 'variables-cifras.json');
  const variables = JSON.parse(readFileSync(rutaVariables, 'utf-8')) as Array<{
    categoriaId: string;
    clave: string;
    etiquetaCuac: string;
    descripcion?: string;
    unidad: string;
    dimensiones: string[];
  }>;

  for (const variable of variables) {
    await prisma.variableCifra.upsert({
      where: {
        categoriaId_clave: {
          categoriaId: variable.categoriaId,
          clave: variable.clave,
        },
      },
      update: {
        etiquetaCuac: variable.etiquetaCuac,
        descripcion: variable.descripcion,
        unidad: variable.unidad,
        dimensiones: variable.dimensiones,
      },
      create: variable,
    });
  }

  console.log('Semilla completada:', {
    usuarios: USUARIOS_SEMILLA.length,
    configuracion: 'global',
    variablesCifras: variables.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
