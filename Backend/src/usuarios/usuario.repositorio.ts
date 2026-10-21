import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { Usuario, RolUsuario, Prisma } from '@prisma/client';

export interface UsuarioSesion {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
  responsableProcesoInstitucional: boolean;
}

export interface UsuarioLogin extends UsuarioSesion {
  contrasena: string;
}

@Injectable()
export class UsuarioRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Login (RLS): corre sin contexto, así que usa la función SECURITY DEFINER
   * siac.login_buscar_usuario, que devuelve solo lo necesario (incluido `activo`).
   */
  async buscarParaLogin(correo: string): Promise<UsuarioLogin | null> {
    const filas = await this.prisma.$queryRaw<UsuarioLogin[]>`
      SELECT * FROM siac.login_buscar_usuario(${correo.toLowerCase()})`;
    return filas[0] ?? null;
  }

  /** Validación del JWT (RLS): sin contexto todavía; función siac.sesion_usuario. */
  async buscarSesion(id: string): Promise<UsuarioSesion | null> {
    const filas = await this.prisma.$queryRaw<UsuarioSesion[]>`
      SELECT * FROM siac.sesion_usuario(${id})`;
    return filas[0] ?? null;
  }

  buscarPorCorreo(correo: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({ where: { correo: correo.toLowerCase() } });
  }

  buscarPorId(id: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({ where: { id } });
  }

  listarTodos(): Promise<Omit<Usuario, 'contrasena'>[]> {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        codigoInstitucional: true,
        nombre: true,
        correo: true,
        cargo: true,
        dependencia: true,
        rol: true,
        responsableProcesoInstitucional: true,
        activo: true,
        idExterno: true,
        origenDato: true,
        fechaSincronizacion: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  listarTodosConProgramas() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        codigoInstitucional: true,
        nombre: true,
        correo: true,
        cargo: true,
        dependencia: true,
        rol: true,
        responsableProcesoInstitucional: true,
        activo: true,
        idExterno: true,
        origenDato: true,
        fechaSincronizacion: true,
        createdAt: true,
        updatedAt: true,
        usuarioProgramas: {
          orderBy: { programa: { nombre: 'asc' } },
          select: {
            programa: {
              select: {
                id: true,
                nombre: true,
                codigo: true,
                slug: true,
                facultad: true,
                nivel: true,
                activo: true,
              },
            },
          },
        },
      },
    });
  }

  actualizarRol(id: string, rol: RolUsuario): Promise<Usuario> {
    return this.prisma.usuario.update({ where: { id }, data: { rol } });
  }

  listarProgramas(usuarioId: string) {
    return this.prisma.usuarioPrograma.findMany({
      where: { usuarioId },
      include: {
        programa: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            slug: true,
            facultad: true,
            nivel: true,
            activo: true,
          },
        },
      },
      orderBy: { programa: { nombre: 'asc' } },
    });
  }

  async reemplazarProgramas(usuarioId: string, programaIds: string[]) {
    const unicos = [...new Set(programaIds)];
    await this.prisma.$transaction([
      this.prisma.usuarioPrograma.deleteMany({
        where: { usuarioId, programaId: { notIn: unicos } },
      }),
      ...unicos.map((programaId) =>
        this.prisma.usuarioPrograma.upsert({
          where: { usuarioId_programaId: { usuarioId, programaId } },
          update: {},
          create: { usuarioId, programaId },
        }),
      ),
    ]);
    return this.listarProgramas(usuarioId);
  }

  contarProgramas(ids: string[]) {
    return this.prisma.programa.count({ where: { id: { in: ids } } });
  }

  actualizar(id: string, datos: Prisma.UsuarioUpdateInput): Promise<Usuario> {
    return this.prisma.usuario.update({ where: { id }, data: datos });
  }

  crear(datos: Prisma.UsuarioCreateInput): Promise<Omit<Usuario, 'contrasena'>> {
    return this.prisma.usuario.create({
      data: datos,
      select: {
        id: true,
        codigoInstitucional: true,
        nombre: true,
        correo: true,
        cargo: true,
        dependencia: true,
        rol: true,
        responsableProcesoInstitucional: true,
        activo: true,
        idExterno: true,
        origenDato: true,
        fechaSincronizacion: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async esResponsableProcesoInstitucional(usuarioId: string): Promise<boolean> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { responsableProcesoInstitucional: true },
    });
    return usuario?.responsableProcesoInstitucional ?? false;
  }

  actualizarAlcanceInstitucional(
    id: string,
    responsable: boolean,
  ): Promise<Pick<Usuario, 'id' | 'responsableProcesoInstitucional'>> {
    return this.prisma.usuario.update({
      where: { id },
      data: { responsableProcesoInstitucional: responsable },
      select: { id: true, responsableProcesoInstitucional: true },
    });
  }

  contarActivosPorRol(rol: RolUsuario): Promise<number> {
    return this.prisma.usuario.count({
      where: { rol, activo: true },
    });
  }
}
