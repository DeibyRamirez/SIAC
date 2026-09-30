import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { CodigoDocumentoGuia, EstadoEvidencia, Prisma, RolUsuario } from '@prisma/client';
import {
  ServicioAlcancePrograma,
  UsuarioAlcance,
} from '../common/alcance/servicio-alcance-programa';

export interface ParametrosBusqueda {
  busqueda?: string;
  programaId?: string;
  codigoGuia?: CodigoDocumentoGuia;
  periodo?: string;
  estado?: EstadoEvidencia;
  formato?: 'pdf' | 'xlsx';
  pagina?: number;
  limite?: number;
}

const CODIGOS_GUIA = Object.values(CodigoDocumentoGuia) as string[];

function guiaDesdeTexto(texto: string): CodigoDocumentoGuia | undefined {
  const normalizado = texto.trim().toUpperCase();
  return CODIGOS_GUIA.includes(normalizado)
    ? (normalizado as CodigoDocumentoGuia)
    : undefined;
}

@Injectable()
export class BusquedaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alcance: ServicioAlcancePrograma,
  ) {}

  async buscar(parametros: ParametrosBusqueda, usuario: UsuarioAlcance) {
    const where: Record<string, unknown> = {};
    if (usuario.rol !== RolUsuario.ParAcademico && parametros.estado) {
      where.estado = parametros.estado;
    }

    if (parametros.programaId) where.programaId = parametros.programaId;
    if (parametros.codigoGuia) where.codigoGuia = parametros.codigoGuia;
    if (parametros.periodo) where.periodo = parametros.periodo;

    if (parametros.formato === 'pdf') {
      where.OR = [
        { mimeType: { contains: 'pdf', mode: 'insensitive' } },
        { nombreArchivo: { endsWith: '.pdf', mode: 'insensitive' } },
      ];
    } else if (parametros.formato === 'xlsx') {
      where.OR = [
        { mimeType: { contains: 'spreadsheet', mode: 'insensitive' } },
        { nombreArchivo: { endsWith: '.xlsx', mode: 'insensitive' } },
      ];
    }

    if (parametros.busqueda) {
      const guiaEnTexto = guiaDesdeTexto(parametros.busqueda);
      const condicionesTexto: Prisma.EvidenciaWhereInput[] = [
        { nombre: { contains: parametros.busqueda, mode: 'insensitive' } },
        { periodo: { contains: parametros.busqueda, mode: 'insensitive' } },
        { nombreArchivo: { contains: parametros.busqueda, mode: 'insensitive' } },
        ...(guiaEnTexto ? [{ codigoGuia: guiaEnTexto }] : []),
      ];
      where.AND = [
        ...(Array.isArray(where.OR) ? [{ OR: where.OR }] : []),
        { OR: condicionesTexto },
      ];
      delete where.OR;
    }

    const pagina = parametros.pagina ?? 1;
    const limite = parametros.limite ?? 20;
    const visibilidad = await this.alcance.filtroVisibilidad(usuario);
    const whereFinal: Prisma.EvidenciaWhereInput = {
      AND: [where as Prisma.EvidenciaWhereInput, visibilidad],
    };

    const [resultados, total] = await this.prisma.$transaction([
      this.prisma.evidencia.findMany({
        where: whereFinal,
        include: {
          programa: { select: { id: true, nombre: true, codigo: true } },
          autor: { select: { id: true, nombre: true } },
        },
        orderBy: { fechaCarga: 'desc' },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      this.prisma.evidencia.count({ where: whereFinal }),
    ]);

    return { resultados, total, pagina, limite };
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

