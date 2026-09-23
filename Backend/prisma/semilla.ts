import {
  PrismaClient,
  RolUsuario,
  EstadoEvidencia,
  EstadoVigencia,
  FormatoArchivo,
  CategoriaPlantilla,
  OrigenDato,
  TipoTramitePlantilla,
  CodigoCondicionDocumentoMaestro,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const MIME_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const RUTA_FORMATOS_GUIA = path.join(__dirname, '..', '..', 'FormatosGuia');

async function sembrarPlantillasFormatosGuia() {
  const entradas: {
    id: string;
    nombre: string;
    archivo: string;
    categoria: CategoriaPlantilla;
    tipoTramite: TipoTramitePlantilla;
    esGuiaDocumentoMaestro: boolean;
    factor: string;
    descripcion: string;
  }[] = [
    {
      id: 'plt-guia-ci',
      nombre: 'Documento Maestro — Condiciones institucionales',
      archivo: 'Informe de Autoevaluación de Condiciones Institucionales (CI).docx',
      categoria: CategoriaPlantilla.Institucional,
      tipoTramite: TipoTramitePlantilla.General,
      esGuiaDocumentoMaestro: true,
      factor: 'CI · Autoevaluación institucional',
      descripcion: 'Guía para el informe de autoevaluación de condiciones institucionales.',
    },
    {
      id: 'plt-guia-cp-ren',
      nombre: 'Documento Maestro — Condiciones de programa (Renovación)',
      archivo: 'Documento Maestro (Condiciones de Programa).docx',
      categoria: CategoriaPlantilla.Programa,
      tipoTramite: TipoTramitePlantilla.Renovacion,
      esGuiaDocumentoMaestro: true,
      factor: 'CP · Renovación de registro calificado',
      descripcion: 'Guía del documento maestro para procesos de renovación.',
    },
    {
      id: 'plt-guia-cp-nuevo',
      nombre: 'Documento Maestro — Condiciones de programa (Nuevo)',
      archivo: 'Plan de Desarrollo (solo para primera vez).docx',
      categoria: CategoriaPlantilla.Programa,
      tipoTramite: TipoTramitePlantilla.NuevoPrograma,
      esGuiaDocumentoMaestro: true,
      factor: 'CP · Creación de programa',
      descripcion: 'Guía del documento maestro para programas de primera vez.',
    },
    {
      id: 'plt-auto-ren',
      nombre: 'Evidencias de autoevaluación de programa (Renovación)',
      archivo: 'Evidencias de Autoevaluación de Programa (Renovación).docx',
      categoria: CategoriaPlantilla.Autoevaluacion,
      tipoTramite: TipoTramitePlantilla.Renovacion,
      esGuiaDocumentoMaestro: false,
      factor: 'Autoevaluación · Renovación',
      descripcion: 'Matriz de evidencias para renovación de registro calificado.',
    },
    {
      id: 'plt-contingencia',
      nombre: 'Plan de contingencia',
      archivo: 'Plan de Contingencia.docx',
      categoria: CategoriaPlantilla.Institucional,
      tipoTramite: TipoTramitePlantilla.General,
      esGuiaDocumentoMaestro: false,
      factor: 'CI · Gestión de riesgos',
      descripcion: 'Formato de plan de contingencia institucional.',
    },
    {
      id: 'plt-modificacion',
      nombre: 'Solicitud de modificación',
      archivo: 'Solicitud de Modificación.docx',
      categoria: CategoriaPlantilla.Programa,
      tipoTramite: TipoTramitePlantilla.General,
      esGuiaDocumentoMaestro: false,
      factor: 'CP · Modificación curricular',
      descripcion: 'Solicitud de modificación de programa.',
    },
  ];

  for (const item of entradas) {
    const origen = path.join(RUTA_FORMATOS_GUIA, item.archivo);
    const rutaAlmacen = `plantillas/formatos-guia/${item.id}/${item.archivo}`;
    if (fs.existsSync(origen)) {
      const destinoDir = path.join(__dirname, '..', 'almacen-local', 'plantillas', 'formatos-guia', item.id);
      fs.mkdirSync(destinoDir, { recursive: true });
      fs.copyFileSync(origen, path.join(destinoDir, item.archivo));
    }

    await prisma.plantilla.upsert({
      where: { id: item.id },
      update: {
        nombre: item.nombre,
        tipoTramite: item.tipoTramite,
        esGuiaDocumentoMaestro: item.esGuiaDocumentoMaestro,
        nombreArchivo: item.archivo,
        rutaArchivo: fs.existsSync(origen) ? rutaAlmacen : null,
        formato: FormatoArchivo.DOCX,
        vigente: true,
      },
      create: {
        id: item.id,
        nombre: item.nombre,
        factor: item.factor,
        formato: FormatoArchivo.DOCX,
        version: '2026.1',
        vigente: true,
        categoria: item.categoria,
        tipoTramite: item.tipoTramite,
        esGuiaDocumentoMaestro: item.esGuiaDocumentoMaestro,
        descripcion: item.descripcion,
        nombreArchivo: item.archivo,
        rutaArchivo: fs.existsSync(origen) ? rutaAlmacen : null,
      },
    });
  }
}

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
    {
      codigo: 'ING-SWC',
      nombre: 'Ingeniería de Software y Computación',
      nivel: 'Pregrado',
      modalidad: 'Presencial',
      duracionSemestres: 10,
    },
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

  await sembrarPlantillasFormatosGuia();

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
      nombreArchivo: 'reglamento-estudiantil.docx',
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
      nombreArchivo: 'informe-autoevaluacion-2024.docx',
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
      nombreArchivo: 'informe-autoevaluacion-institucional.docx',
    },
    {
      id: 'ev-seed-004',
      nombre: 'Actas de comité curricular',
      programaId: programasCreados[1].id,
      periodo: '2025-1',
      factor: 'CP-4 Pertinencia curricular',
      indicador: 'Actas comité curricular',
      nombreArchivo: 'actas-comite-curricular.docx',
    },
    {
      id: 'ev-seed-005',
      nombre: 'Plan de mejoramiento académico',
      programaId: programasCreados[2].id,
      periodo: '2025-2',
      factor: 'CI-5 Seguimiento al plan',
      indicador: 'Plan de mejoramiento',
      nombreArchivo: 'plan-mejoramiento-academico.docx',
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
        mimeType: MIME_DOCX,
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
        mimeType: MIME_DOCX,
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

  const carpetaCp = await prisma.carpetaNormativa.upsert({
    where: { id: 'carp-seed-cp' },
    update: {},
    create: {
      id: 'carp-seed-cp',
      etapaId: etapa.id,
      nombre: 'Condiciones de programa',
      descripcion: 'Documento maestro y anexos de programa',
      orden: 2,
      activa: true,
    },
  });

  const docMaestro = await prisma.documentoRequerido.upsert({
    where: { id: 'doc-seed-maestro' },
    update: { requiereChecklistMaestro: true, formato: FormatoArchivo.DOCX },
    create: {
      id: 'doc-seed-maestro',
      carpetaId: carpetaCp.id,
      nombre: 'Documento maestro de programa',
      esPlantilla: true,
      formato: FormatoArchivo.DOCX,
      obligatorio: true,
      requiereChecklistMaestro: true,
      orden: 1,
    },
  });

  const programaIngSw = programasCreados.find((p) => p.codigo === 'ING-SWC');

  if (programaIngSw) {
    const evMaestroId = 'ev-seed-maestro-ing-sw';
    await prisma.evidencia.upsert({
      where: { id: evMaestroId },
      update: {
        porcentajeCompletitud: 89,
        estado: EstadoEvidencia.Rechazado,
        requiereChecklistMaestro: true,
      },
      create: {
        id: evMaestroId,
        nombre: 'Documento Maestro Ingeniería de Software 2026',
        programaId: programaIngSw.id,
        documentoRequeridoId: docMaestro.id,
        periodo: '2026-1',
        factor: 'Factor 1 · Proyecto educativo',
        indicador: 'Indicador 1.1 · Diseño curricular y plan de estudios',
        estado: EstadoEvidencia.Rechazado,
        autorId: cargador.id,
        nombreArchivo: 'Documento_Maestro_IngSoftware.docx',
        responsable: cargador.nombre,
        requiereChecklistMaestro: true,
        porcentajeCompletitud: 89,
        observaciones:
          '• Aspectos curriculares: Falta profundizar el enfoque en competencias transversales.',
        rutaArchivo: `evidencias/2026/${evMaestroId}/v1/Documento_Maestro_IngSoftware.docx`,
        mimeType: MIME_DOCX,
        version: 1,
      },
    });

    const condicionesDemo: {
      codigo: CodigoCondicionDocumentoMaestro;
      cumple: boolean;
      observacion?: string;
    }[] = [
      { codigo: CodigoCondicionDocumentoMaestro.Denominacion, cumple: true },
      { codigo: CodigoCondicionDocumentoMaestro.Justificacion, cumple: true },
      {
        codigo: CodigoCondicionDocumentoMaestro.AspectosCurriculares,
        cumple: false,
        observacion:
          'Falta profundizar el enfoque en competencias transversales del plan de estudios.',
      },
      { codigo: CodigoCondicionDocumentoMaestro.OrganizacionActividades, cumple: true },
      { codigo: CodigoCondicionDocumentoMaestro.InvestigacionInnovacion, cumple: true },
      { codigo: CodigoCondicionDocumentoMaestro.RelacionSectorExterno, cumple: true },
      { codigo: CodigoCondicionDocumentoMaestro.Profesores, cumple: true },
      { codigo: CodigoCondicionDocumentoMaestro.MediosEducativos, cumple: true },
      { codigo: CodigoCondicionDocumentoMaestro.Infraestructura, cumple: true },
    ];

    for (const fila of condicionesDemo) {
      await prisma.evaluacionCondicionEvidencia.upsert({
        where: {
          evidenciaId_numeroRevision_codigoCondicion: {
            evidenciaId: evMaestroId,
            numeroRevision: 1,
            codigoCondicion: fila.codigo,
          },
        },
        update: {
          cumple: fila.cumple,
          observacion: fila.observacion,
        },
        create: {
          evidenciaId: evMaestroId,
          numeroRevision: 1,
          codigoCondicion: fila.codigo,
          cumple: fila.cumple,
          observacion: fila.observacion,
          revisorId: revisor.id,
        },
      });
    }

    await prisma.programa.update({
      where: { id: programaIngSw.id },
      data: { porcentajeAvance: 89, estadoProceso: 'En revisión documental' },
    });
  }

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
