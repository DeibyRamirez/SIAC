/**
 * Datos de negocio efímeros para Newman (BD local/CI). Escribe IDs en docs/pruebas/postman/fixtures-newman.ids.json
 */
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CategoriaAnexo,
  CodigoDocumentoGuia,
  EstadoEvidencia,
  EstadoVigencia,
  OrigenDato,
  PrismaClient,
  RolUsuario,
  TipoTramiteSIAC,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  abortarScriptSiProduccion,
  esHostDesechable,
  hostDeUrlBaseDatos,
} from '../src/common/config/host-base-datos';
import { crearDocxE2E } from '../test/utilidades/docx-e2e';

const REPO = join(__dirname, '../..');
const SALIDA = join(REPO, 'docs/pruebas/postman/fixtures-newman.ids.json');

function verificarHost(): void {
  abortarScriptSiProduccion('newman-fixtures');
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '';
  const host = hostDeUrlBaseDatos(url);
  if (!esHostDesechable(host)) {
    throw new Error(`[newman-fixtures] Solo BD local/CI (host: ${host}).`);
  }
}

async function main(): Promise<void> {
  verificarHost();
  const clave = process.env.NEWMAN_CLAVE_PRUEBA ?? '';
  if (clave.length < 12) {
    throw new Error('[newman-fixtures] Defina NEWMAN_CLAVE_PRUEBA (mín. 12 caracteres).');
  }

  const prisma = new PrismaClient({
    datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  });

  try {
    const hashClave = await bcrypt.hash(clave, 4);
    const correoCargador = 'maria.cargadora@uniautonoma.edu.co';
    const usuarioDeshabilitar = await prisma.usuario.upsert({
      where: { correo: 'newman.deshabilitar@uniautonoma.edu.co' },
      update: { contrasena: hashClave, activo: true, rol: RolUsuario.Cargador },
      create: {
        nombre: 'Usuario Newman deshabilitar',
        correo: 'newman.deshabilitar@uniautonoma.edu.co',
        contrasena: hashClave,
        rol: RolUsuario.Cargador,
        activo: true,
        origenDato: OrigenDato.Manual,
      },
    });

    const cargador = await prisma.usuario.upsert({
      where: { correo: correoCargador },
      update: { contrasena: hashClave, activo: true },
      create: {
        nombre: 'María Cortés',
        correo: correoCargador,
        contrasena: hashClave,
        rol: RolUsuario.Cargador,
        cargo: 'Docente',
        dependencia: 'Ingeniería',
        origenDato: OrigenDato.Manual,
      },
    });

    const programa = await prisma.programa.create({
      data: {
        nombre: 'Programa Newman',
        codigo: `NM-${randomBytes(4).toString('hex')}`,
        slug: `newman-${randomBytes(3).toString('hex')}`,
        nivel: 'Profesional',
        tipoTramiteActivo: TipoTramiteSIAC.RegistroCalificadoNuevo,
      },
    });

    const programaCarga = await prisma.programa.create({
      data: {
        nombre: 'Programa Newman carga',
        codigo: `NC-${randomBytes(4).toString('hex')}`,
        slug: `newman-carga-${randomBytes(3).toString('hex')}`,
        nivel: 'Profesional',
        tipoTramiteActivo: TipoTramiteSIAC.RegistroCalificadoNuevo,
      },
    });
    await prisma.usuarioPrograma.create({
      data: { usuarioId: cargador.id, programaId: programaCarga.id },
    });

    await prisma.usuarioPrograma.create({
      data: { usuarioId: cargador.id, programaId: programa.id },
    });

    const revisor = await prisma.usuario.findFirst({ where: { correo: 'revisor.calidad@uniautonoma.edu.co' } });
    if (revisor) {
      await prisma.usuarioPrograma.upsert({
        where: { usuarioId_programaId: { usuarioId: revisor.id, programaId: programa.id } },
        update: {},
        create: { usuarioId: revisor.id, programaId: programa.id },
      });
    }

    const etapa = await prisma.etapaAcreditacion.create({
      data: {
        nombre: 'Etapa Newman',
        tipo: 'Programa',
        descripcion: 'Fixture Newman',
        orden: 99,
      },
    });
    const carpeta = await prisma.carpetaNormativa.create({
      data: {
        etapaId: etapa.id,
        nombre: 'Carpeta Newman',
        descripcion: 'Fixture',
        orden: 1,
      },
    });
    const documento = await prisma.documentoRequerido.create({
      data: {
        carpetaId: carpeta.id,
        nombre: 'Doc Newman',
        esPlantilla: false,
        formato: 'DOCX',
        obligatorio: true,
        orden: 1,
      },
    });

    const institucion = await prisma.institucion.findFirst();
    if (!institucion) throw new Error('Falta institución en migraciones.');

    const docx = await crearDocxE2E('Newman almacen local');

    const evidenciaBorrador = await prisma.evidencia.create({
      data: {
        nombre: 'Evidencia Newman borrador',
        autorId: cargador.id,
        programaId: programa.id,
        codigoGuia: CodigoDocumentoGuia.G1,
        estado: EstadoEvidencia.Borrador,
        periodo: '2026-2',
        nombreArchivo: 'newman-borrador.docx',
        rutaArchivo: 'evidencias/newman/borrador.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        tamanoBytes: docx.length,
        versiones: {
          create: {
            numero: 1,
            nombreArchivo: 'newman-borrador.docx',
            rutaArchivo: 'evidencias/newman/borrador.docx',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            tamanoBytes: docx.length,
            subidoPorId: cargador.id,
          },
        },
      },
    });

    const evidenciaParaEnviar = await prisma.evidencia.create({
      data: {
        nombre: 'Evidencia Newman enviar',
        autorId: cargador.id,
        programaId: programa.id,
        codigoGuia: CodigoDocumentoGuia.G1,
        estado: EstadoEvidencia.Borrador,
        periodo: '2026-2',
        nombreArchivo: 'newman-enviar.docx',
      },
    });

    const evidenciaParaEliminar = await prisma.evidencia.create({
      data: {
        nombre: 'Evidencia Newman eliminar',
        autorId: cargador.id,
        programaId: programa.id,
        codigoGuia: CodigoDocumentoGuia.G1,
        estado: EstadoEvidencia.Borrador,
        periodo: '2026-2',
        nombreArchivo: 'newman-eliminar.docx',
      },
    });

    const evidenciaRevision = await prisma.evidencia.create({
      data: {
        nombre: 'Evidencia Newman revisión',
        autorId: cargador.id,
        programaId: programa.id,
        codigoGuia: CodigoDocumentoGuia.G1,
        estado: EstadoEvidencia.EnRevision,
        periodo: '2026-2',
        nombreArchivo: 'newman-revision.docx',
        versiones: {
          create: {
            numero: 1,
            nombreArchivo: 'newman-revision.docx',
            rutaArchivo: 'evidencias/newman/revision.docx',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            tamanoBytes: docx.length,
            subidoPorId: cargador.id,
          },
        },
      },
    });

    const alerta = await prisma.alertaInApp.create({
      data: {
        usuarioId: cargador.id,
        tipo: 'general',
        mensaje: 'Alerta fixture Newman',
        leida: false,
        claveEvento: `newman-${randomBytes(6).toString('hex')}`,
      },
    });

    const plantilla = await prisma.plantilla.create({
      data: {
        nombre: 'Plantilla Newman',
        formato: 'DOCX',
        version: '1.0',
        vigente: true,
        categoria: 'Programa',
        tipoTramite: 'General',
        codigoGuia: 'G1',
        nombreArchivo: 'newman-plantilla.docx',
        rutaArchivo: 'plantillas/newman/newman-plantilla.docx',
      },
    });

    const rutaLocal = process.env.ALMACEN_LOCAL_RUTA ?? join(REPO, 'Backend/almacen-local');
    const claveAlmacen = `newman/descarga-prueba.docx`;
    const rutaAbs = join(rutaLocal, claveAlmacen);
    mkdirSync(join(rutaLocal, 'newman'), { recursive: true });
    mkdirSync(join(rutaLocal, 'evidencias/newman'), { recursive: true });
    writeFileSync(rutaAbs, docx);
    writeFileSync(join(rutaLocal, 'evidencias/newman/borrador.docx'), docx);
    writeFileSync(join(rutaLocal, 'evidencias/newman/revision.docx'), docx);
    mkdirSync(join(rutaLocal, 'plantillas/newman'), { recursive: true });
    writeFileSync(join(rutaLocal, 'plantillas/newman/newman-plantilla.docx'), docx);
    const claveAnexo = `documentos/newman/anexo-vigencia.docx`;
    mkdirSync(join(rutaLocal, 'documentos/newman'), { recursive: true });
    writeFileSync(join(rutaLocal, claveAnexo), docx);

    const vencimiento = new Date();
    vencimiento.setFullYear(vencimiento.getFullYear() + 2);
    const anexoVigencia = await prisma.anexoVigencia.create({
      data: {
        titulo: 'Anexo Newman',
        programaId: programa.id,
        tipo: 'Certificado',
        categoria: CategoriaAnexo.Otro,
        evidenciaId: evidenciaRevision.id,
        carpeta: 'newman',
        nombreArchivo: 'anexo-vigencia.docx',
        rutaArchivo: claveAnexo,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        aniosVigencia: 7,
        fechaVencimiento: vencimiento,
        estado: EstadoVigencia.Vigente,
        responsable: 'Fixture Newman',
      },
    });
    const fixtureDocx = join(REPO, 'docs/pruebas/fixtures/newman-evidencia.docx');
    mkdirSync(join(REPO, 'docs/pruebas/fixtures'), { recursive: true });
    writeFileSync(fixtureDocx, docx);
    if (!existsSync(rutaAbs)) throw new Error('No se pudo escribir archivo de almacen local.');

    const claveIntegradorPlano = `siac_${randomBytes(18).toString('hex')}`;
    const hashIntegrador = createHash('sha256').update(claveIntegradorPlano).digest('hex');
    const integrador = await prisma.integrador.create({
      data: { nombre: 'Newman integrador', hashClave: hashIntegrador, activo: true },
    });
    const integradorRevocar = await prisma.integrador.create({
      data: {
        nombre: 'Newman revocar',
        hashClave: createHash('sha256').update(`siac_${randomBytes(18).toString('hex')}`).digest('hex'),
        activo: true,
      },
    });

    const urlPbi =
      'https://app.powerbi.com/reportEmbed?reportId=22222222-2222-2222-2222-222222222222&ctid=11111111-1111-1111-1111-111111111111';
    const urlHash = createHash('sha256').update(urlPbi).digest('hex');
    await prisma.configuracionInformePowerBi.upsert({
      where: { categoriaId: 'estudiantes' },
      update: { urlPublica: urlPbi, urlHash, activo: true },
      create: { categoriaId: 'estudiantes', urlPublica: urlPbi, urlHash, activo: true },
    });

    const ids = {
      programaId: programa.id,
      programaIdCarga: programaCarga.id,
      programaSlug: programa.slug,
      etapaId: etapa.id,
      carpetaId: carpeta.id,
      documentoRequeridoId: documento.id,
      evidenciaId: evidenciaBorrador.id,
      evidenciaIdEnviar: evidenciaParaEnviar.id,
      evidenciaIdEliminar: evidenciaParaEliminar.id,
      evidenciaEnRevisionId: evidenciaRevision.id,
      vigenciaAnexoId: anexoVigencia.id,
      alertaId: alerta.id,
      plantillaId: plantilla.id,
      usuarioId: cargador.id,
      usuarioIdDeshabilitar: usuarioDeshabilitar.id,
      integradorId: integrador.id,
      integradorIdRevocar: integradorRevocar.id,
      apiKeyIntegrador: claveIntegradorPlano,
      almacenClavePrueba: claveAlmacen,
      categoriaCifras: 'estudiantes',
      periodoAcademico: '2026-1',
      tipoTramite: 'RegistroCalificadoNuevo',
    };

    writeFileSync(SALIDA, `${JSON.stringify(ids, null, 2)}\n`);
    console.log(`[newman-fixtures] Escrito ${SALIDA} (sin claves en stdout).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
