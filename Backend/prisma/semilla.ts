import {
  PrismaClient,
  RolUsuario,
  EstadoEvidencia,
  EstadoVigencia,
  FormatoArchivo,
  CategoriaPlantilla,
  OrigenDato,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Sembrando base de datos SIAC...');

  const hashCargador = await bcrypt.hash('Cargador2026', 10);
  const hashRevisor = await bcrypt.hash('Revisor2026', 10);
  const hashAdmin = await bcrypt.hash('Admin2026', 10);
  const hashPar = await bcrypt.hash('Par2026', 10);
  const hashSuperAdmin = await bcrypt.hash('SuperAdmin2026', 10);

  const cargador = await prisma.usuario.upsert({
    where: { correo: 'maria.cargadora@uniautonoma.edu.co' },
    update: {},
    create: {
      nombre: 'María Cortés',
      correo: 'maria.cargadora@uniautonoma.edu.co',
      contrasena: hashCargador,
      rol: RolUsuario.Cargador,
      cargo: 'Docente',
      dependencia: 'Ingeniería de Sistemas',
      origenDato: OrigenDato.Manual,
    },
  });

  const revisor = await prisma.usuario.upsert({
    where: { correo: 'revisor.calidad@uniautonoma.edu.co' },
    update: {},
    create: {
      nombre: 'Laura Ramírez',
      correo: 'revisor.calidad@uniautonoma.edu.co',
      contrasena: hashRevisor,
      rol: RolUsuario.Revisor,
      cargo: 'Profesional de Planeación',
      dependencia: 'Planeación',
      origenDato: OrigenDato.Manual,
    },
  });

  const admin = await prisma.usuario.upsert({
    where: { correo: 'admin.planeacion@uniautonoma.edu.co' },
    update: {},
    create: {
      nombre: 'Oscar Alvarado',
      correo: 'admin.planeacion@uniautonoma.edu.co',
      contrasena: hashAdmin,
      rol: RolUsuario.Administrador,
      cargo: 'Director de Planeación',
      dependencia: 'Planeación',
      origenDato: OrigenDato.Manual,
    },
  });

  await prisma.usuario.upsert({
    where: { correo: 'par.academico@uniautonoma.edu.co' },
    update: {},
    create: {
      nombre: 'Carlos Méndez',
      correo: 'par.academico@uniautonoma.edu.co',
      contrasena: hashPar,
      rol: RolUsuario.ParAcademico,
      cargo: 'Par Académico MEN',
      dependencia: 'Externo',
      origenDato: OrigenDato.Manual,
    },
  });

  await prisma.usuario.upsert({
    where: { correo: 'superadmin@uniautonoma.edu.co' },
    update: {},
    create: {
      nombre: 'Ana SuperAdmin',
      correo: 'superadmin@uniautonoma.edu.co',
      contrasena: hashSuperAdmin,
      rol: RolUsuario.SuperAdmin,
      cargo: 'Super Administrador TI',
      dependencia: 'Planeación',
      origenDato: OrigenDato.Manual,
    },
  });

  const programas = [
    { codigo: 'ING-SIS', nombre: 'Ingeniería de Sistemas', nivel: 'Pregrado', modalidad: 'Presencial', duracionSemestres: 10 },
    { codigo: 'DER', nombre: 'Derecho', nivel: 'Pregrado', modalidad: 'Presencial', duracionSemestres: 10 },
    { codigo: 'ADM-EMP', nombre: 'Administración de Empresas', nivel: 'Pregrado', modalidad: 'Presencial', duracionSemestres: 9 },
    { codigo: 'PSI', nombre: 'Psicología', nivel: 'Pregrado', modalidad: 'Presencial', duracionSemestres: 10 },
    { codigo: 'ENF', nombre: 'Enfermería', nivel: 'Pregrado', modalidad: 'Presencial', duracionSemestres: 10 },
    { codigo: 'CON', nombre: 'Contaduría Pública', nivel: 'Pregrado', modalidad: 'Presencial', duracionSemestres: 9 },
    { codigo: 'COM-SOC', nombre: 'Comunicación Social', nivel: 'Pregrado', modalidad: 'Presencial', duracionSemestres: 9 },
    { codigo: 'EDU-INF', nombre: 'Licenciatura en Educación Infantil', nivel: 'Pregrado', modalidad: 'Presencial', duracionSemestres: 9 },
    { codigo: 'ESP-CIB', nombre: 'Especialización en Ciberseguridad', nivel: 'Posgrado', modalidad: 'Virtual', duracionSemestres: 2 },
    { codigo: 'ESP-INN', nombre: 'Especialización en Innovación', nivel: 'Posgrado', modalidad: 'Presencial', duracionSemestres: 2 },
    { codigo: 'MAE-GES', nombre: 'Maestría en Gestión de Proyectos', nivel: 'Posgrado', modalidad: 'Virtual', duracionSemestres: 4 },
    { codigo: 'TEC-SOF', nombre: 'Tecnología en Desarrollo de Software', nivel: 'Pregrado', modalidad: 'Presencial', duracionSemestres: 6 },
  ];

  const programasCreados = [];
  for (const p of programas) {
    const prog = await prisma.programa.upsert({
      where: { codigo: p.codigo },
      update: {},
      create: {
        ...p,
        semaforo: 'Verde',
        porcentajeAvance: 45,
        estadoProceso: 'En curso',
        origenDato: OrigenDato.Manual,
      },
    });
    programasCreados.push(prog);
  }

  await prisma.usuarioPrograma.upsert({
    where: { id: 'up-seed-001' },
    update: {},
    create: {
      id: 'up-seed-001',
      usuarioId: cargador.id,
      programaId: programasCreados[0].id,
    },
  });

  await prisma.plantilla.upsert({
    where: { id: 'plt-seed-001' },
    update: {},
    create: {
      id: 'plt-seed-001',
      nombre: 'Informe de Autoevaluación',
      factor: 'CI-3 Cultura de autoevaluación',
      formato: FormatoArchivo.DOCX,
      version: '2026.1',
      vigente: true,
      categoria: CategoriaPlantilla.Autoevaluacion,
      descripcion: 'Plantilla oficial para informe de autoevaluación institucional.',
    },
  });

  await prisma.plantilla.upsert({
    where: { id: 'plt-seed-002' },
    update: {},
    create: {
      id: 'plt-seed-002',
      nombre: 'Estudio de Pertinencia',
      factor: 'CP-2 Justificación',
      formato: FormatoArchivo.PDF,
      version: '2026.1',
      vigente: true,
      categoria: CategoriaPlantilla.Programa,
      descripcion: 'Formato para estudio de pertinencia de programas nuevos.',
    },
  });

  await prisma.evidencia.upsert({
    where: { id: 'ev-seed-001' },
    update: {},
    create: {
      id: 'ev-seed-001',
      nombre: 'Reglamento estudiantil vigente',
      programaId: programasCreados[0].id,
      periodo: '2025-1',
      factor: 'CI-1 Selección y evaluación',
      indicador: 'Reglamento estudiantil',
      estado: EstadoEvidencia.Borrador,
      autorId: cargador.id,
      nombreArchivo: 'reglamento-estudiantil.pdf',
      responsable: cargador.nombre,
    },
  });

  await prisma.evidencia.upsert({
    where: { id: 'ev-seed-002' },
    update: {},
    create: {
      id: 'ev-seed-002',
      nombre: 'Informe autoevaluación 2024',
      programaId: programasCreados[0].id,
      periodo: '2024-2',
      factor: 'CI-3 Cultura de autoevaluación',
      indicador: 'Informe de autoevaluación',
      estado: EstadoEvidencia.Validado,
      autorId: cargador.id,
      nombreArchivo: 'informe-autoevaluacion-2024.pdf',
      responsable: cargador.nombre,
    },
  });

  const evidenciasEnRevision = [
    {
      id: 'ev-seed-003',
      nombre: 'Informe de autoevaluación institucional',
      programaId: programasCreados[0].id,
      periodo: '2024-2',
      factor: 'CI-3 Cultura de autoevaluación',
      indicador: 'Autoevaluación CI',
      nombreArchivo: 'informe-autoevaluacion-institucional.pdf',
    },
    {
      id: 'ev-seed-004',
      nombre: 'Actas de comité curricular',
      programaId: programasCreados[1].id,
      periodo: '2025-1',
      factor: 'CP-4 Pertinencia curricular',
      indicador: 'Actas comité curricular',
      nombreArchivo: 'actas-comite-curricular.pdf',
    },
    {
      id: 'ev-seed-005',
      nombre: 'Plan de mejoramiento académico',
      programaId: programasCreados[2].id,
      periodo: '2025-2',
      factor: 'CI-5 Seguimiento al plan',
      indicador: 'Plan de mejoramiento',
      nombreArchivo: 'plan-mejoramiento-academico.pdf',
    },
  ];

  for (const ev of evidenciasEnRevision) {
    const rutaArchivo = `evidencias/2026/${ev.id}/v1/${ev.nombreArchivo}`;
    await prisma.evidencia.upsert({
      where: { id: ev.id },
      update: { estado: EstadoEvidencia.EnRevision },
      create: {
        ...ev,
        estado: EstadoEvidencia.EnRevision,
        autorId: cargador.id,
        responsable: cargador.nombre,
        rutaArchivo,
        mimeType: 'application/pdf',
        version: 1,
      },
    });

    await prisma.evidenciaVersion.upsert({
      where: {
        evidenciaId_numero: { evidenciaId: ev.id, numero: 1 },
      },
      update: {},
      create: {
        evidenciaId: ev.id,
        numero: 1,
        nombreArchivo: ev.nombreArchivo,
        rutaArchivo,
        mimeType: 'application/pdf',
        subidoPorId: cargador.id,
      },
    });

    await prisma.historialEvidencia.upsert({
      where: { id: `hist-${ev.id}-revision` },
      update: {},
      create: {
        id: `hist-${ev.id}-revision`,
        evidenciaId: ev.id,
        estado: EstadoEvidencia.EnRevision,
        observacion: 'Enviada a revisión (semilla)',
        actorId: cargador.id,
      },
    });
  }

  const fechaProxima = new Date();
  fechaProxima.setDate(fechaProxima.getDate() + 15);

  const fechaVencida = new Date();
  fechaVencida.setDate(fechaVencida.getDate() - 10);

  await prisma.anexoVigencia.upsert({
    where: { id: 'anx-seed-001' },
    update: {},
    create: {
      id: 'anx-seed-001',
      titulo: 'Permiso de uso de suelos — Sede principal',
      programaId: programasCreados[0].id,
      tipo: 'Infraestructura',
      fechaVencimiento: fechaProxima,
      estado: EstadoVigencia.Proximo,
      responsable: admin.correo,
    },
  });

  await prisma.anexoVigencia.upsert({
    where: { id: 'anx-seed-002' },
    update: {},
    create: {
      id: 'anx-seed-002',
      titulo: 'Certificado bomberos — Laboratorio',
      programaId: programasCreados[4].id,
      tipo: 'Infraestructura',
      fechaVencimiento: fechaVencida,
      estado: EstadoVigencia.Vencido,
      responsable: admin.correo,
    },
  });

  const etapa = await prisma.etapaAcreditacion.upsert({
    where: { id: 'etapa-seed-001' },
    update: {},
    create: {
      id: 'etapa-seed-001',
      nombre: 'Pre-radicación',
      tipo: 'PreRadicacion',
      descripcion: 'Evaluación de condiciones institucionales (CI)',
      orden: 1,
      activa: true,
    },
  });

  await prisma.carpetaNormativa.upsert({
    where: { id: 'carp-seed-001' },
    update: {},
    create: {
      id: 'carp-seed-001',
      etapaId: etapa.id,
      nombre: 'Condiciones Institucionales',
      descripcion: 'Documentos de las 6 CI del Decreto 1330',
      orden: 1,
      activa: true,
    },
  });

  console.log('Semilla completada:', {
    usuarios: 5,
    programas: programasCreados.length,
    evidencias: 2 + evidenciasEnRevision.length,
    enRevision: evidenciasEnRevision.length,
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
