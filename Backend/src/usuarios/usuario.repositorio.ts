import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { Usuario, RolUsuario, Prisma } from '@prisma/client';

@Injectable()
export class UsuarioRepositorio {
  constructor(private readonly prisma: PrismaService) {}

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
}
