import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { Prisma, RolUsuario } from '@prisma/client';
import {
  ServicioAlcancePrograma,
  UsuarioAlcance,
} from '../common/alcance/servicio-alcance-programa';
import { EvidenciaRepositorio } from '../documentos/evidencia.repositorio';
import {
  ParametrosConsultaEvidenciasEntrada,
  parsearParametrosConsultaEvidencias,
} from '../documentos/parametros-consulta-evidencias';

export type ParametrosBusqueda = ParametrosConsultaEvidenciasEntrada;

@Injectable()
export class BusquedaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alcance: ServicioAlcancePrograma,
    private readonly evidenciaRepo: EvidenciaRepositorio,
  ) {}

  async buscar(parametros: ParametrosBusqueda, usuario: UsuarioAlcance) {
    const filtros = parsearParametrosConsultaEvidencias(parametros, {
      rolUsuario: usuario.rol,
      usarFts: true,
    });
    filtros.alcance = await this.alcance.filtroVisibilidad(usuario);

    const [resultados, total] = await this.evidenciaRepo.listar(filtros);

    return {
      resultados,
      total,
      pagina: filtros.pagina ?? 1,
      limite: filtros.limite ?? 20,
    };
  }

  async buscarUnificada(consulta: string, usuario: UsuarioAlcance, limite = 8) {
    if (!consulta || consulta.trim().length < 2) {
      return { evidencias: [], plantillas: [], documentos: [] };
    }

    const q = consulta.trim();
    const visibilidad = await this.alcance.filtroVisibilidad(usuario);
    const filtroPrograma =
      usuario.rol === RolUsuario.Cargador || usuario.rol === RolUsuario.Revisor
        ? { programaId: { in: await this.alcance.idsProgramasAsignados(usuario.id) } }
        : {};

    const [evidencias, plantillas, documentos] = await Promise.all([
      this.prisma.evidencia.findMany({
        where: {
          AND: [
            visibilidad,
            {
              OR: [
                { nombre: { contains: q, mode: 'insensitive' } },
                { nombreArchivo: { contains: q, mode: 'insensitive' } },
              ],
            },
          ],
        },
        select: { id: true, nombre: true, nombreArchivo: true, estado: true, programaId: true },
        take: limite,
        orderBy: { fechaCarga: 'desc' },
      }),
      this.prisma.plantilla.findMany({
        where: {
          vigente: true,
          OR: [
            { nombre: { contains: q, mode: 'insensitive' } },
            { nombreArchivo: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, nombre: true, nombreArchivo: true, categoria: true },
        take: limite,
      }),
      this.prisma.anexoVigencia.findMany({
        where: {
          ...filtroPrograma,
          rutaArchivo: { not: null },
          OR: [
            { titulo: { contains: q, mode: 'insensitive' } },
            { nombreArchivo: { contains: q, mode: 'insensitive' } },
            { carpeta: { contains: q, mode: 'insensitive' } },
            { tipo: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titulo: true, nombreArchivo: true, carpeta: true, estado: true },
        take: limite,
      }),
    ]);

    return { evidencias, plantillas, documentos };
  }
}
