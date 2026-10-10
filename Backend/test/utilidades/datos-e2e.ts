import { CodigoDocumentoGuia, EstadoEvidencia, Prisma, RolUsuario, TipoTramiteSIAC } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../src/prisma/prisma.module';

/** Datos sintéticos para las E2E. Todo lo creado aquí lo borra `limpiarDatosNegocio`. */
export async function crearPrograma(
  prisma: PrismaService,
  datos: { nombre: string; slug: string; tipoTramiteActivo?: TipoTramiteSIAC; fechaResolucion?: Date | null },
) {
  return prisma.programa.create({
    data: {
      nombre: datos.nombre,
      codigo: `E2E-${datos.slug.toUpperCase()}`,
      slug: datos.slug,
      nivel: 'Profesional',
      tipoTramiteActivo: datos.tipoTramiteActivo ?? TipoTramiteSIAC.RegistroCalificadoNuevo,
      fechaResolucion: datos.fechaResolucion ?? null,
    },
  });
}

export async function asignarPrograma(prisma: PrismaService, usuarioId: string, programaId: string) {
  await prisma.usuarioPrograma.create({ data: { usuarioId, programaId } });
}

export async function crearUsuarioE2E(
  prisma: PrismaService,
  datos: { alias: string; rol: RolUsuario; contrasena: string },
) {
  return prisma.usuario.create({
    data: {
      nombre: `Usuario E2E ${datos.alias}`,
      correo: `${datos.alias}@e2e.siac.test`,
      contrasena: await bcrypt.hash(datos.contrasena, 4),
      rol: datos.rol,
    },
  });
}

export async function idInstitucion(prisma: PrismaService): Promise<string> {
  const institucion = await prisma.institucion.findFirst();
  if (!institucion) throw new Error('La migración 20260928120000 debe crear la institución CUAC.');
  return institucion.id;
}

export async function crearEvidencia(
  prisma: PrismaService,
  datos: {
    nombre: string;
    autorId: string;
    programaId?: string;
    institucionId?: string;
    codigoGuia: CodigoDocumentoGuia;
    estado: EstadoEvidencia;
    puntaje?: number;
    total?: number;
    periodo?: string;
  },
) {
  const data: Prisma.EvidenciaUncheckedCreateInput = {
    nombre: datos.nombre,
    autorId: datos.autorId,
    programaId: datos.programaId ?? null,
    institucionId: datos.institucionId ?? null,
    codigoGuia: datos.codigoGuia,
    estado: datos.estado,
    periodo: datos.periodo ?? '2026-2',
    nombreArchivo: `${datos.nombre}.docx`,
    puntajeActual: datos.puntaje ?? null,
    totalCondicionesActual: datos.total ?? null,
  };
  return prisma.evidencia.create({ data });
}
