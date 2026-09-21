import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { EstadoEvidencia } from '@prisma/client';

export interface ParametrosBusqueda {
  busqueda?: string;
  programaId?: string;
  factor?: string;
  indicador?: string;
  periodo?: string;
  estado?: EstadoEvidencia;
  formato?: 'pdf' | 'xlsx';
  pagina?: number;
  limite?: number;
}

@Injectable()
export class BusquedaService {
  constructor(private readonly prisma: PrismaService) {}

  async buscar(parametros: ParametrosBusqueda, soloValidados = false) {
    const where: Record<string, unknown> = {};

    if (soloValidados) where.estado = EstadoEvidencia.Validado;
    else if (parametros.estado) where.estado = parametros.estado;

    if (parametros.programaId) where.programaId = parametros.programaId;
    if (parametros.factor) where.factor = parametros.factor;
    if (parametros.indicador) where.indicador = parametros.indicador;
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
      const condicionesTexto = [
        { nombre: { contains: parametros.busqueda, mode: 'insensitive' } },
        { factor: { contains: parametros.busqueda, mode: 'insensitive' } },
        { indicador: { contains: parametros.busqueda, mode: 'insensitive' } },
        { periodo: { contains: parametros.busqueda, mode: 'insensitive' } },
        { nombreArchivo: { contains: parametros.busqueda, mode: 'insensitive' } },
      ];
      where.AND = [
        ...(Array.isArray(where.OR) ? [{ OR: where.OR }] : []),
        { OR: condicionesTexto },
      ];
      delete where.OR;
    }

    const pagina = parametros.pagina ?? 1;
    const limite = parametros.limite ?? 20;

    const [resultados, total] = await this.prisma.$transaction([
      this.prisma.evidencia.findMany({
        where,
        include: {
          programa: { select: { id: true, nombre: true, codigo: true } },
          autor: { select: { id: true, nombre: true } },
        },
        orderBy: { fechaCarga: 'desc' },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      this.prisma.evidencia.count({ where }),
    ]);

    return { resultados, total, pagina, limite };
  }

  async buscarUnificada(consulta: string, soloValidados = false, limite = 8) {
    if (!consulta || consulta.trim().length < 2) {
      return { evidencias: [], plantillas: [], documentos: [] };
    }

    const q = consulta.trim();
    const filtroEstado = soloValidados ? { estado: EstadoEvidencia.Validado } : {};

    const [evidencias, plantillas, documentos] = await Promise.all([
      this.prisma.evidencia.findMany({
        where: {
          ...filtroEstado,
          OR: [
            { nombre: { contains: q, mode: 'insensitive' } },
            { nombreArchivo: { contains: q, mode: 'insensitive' } },
            { factor: { contains: q, mode: 'insensitive' } },
            { indicador: { contains: q, mode: 'insensitive' } },
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
            { factor: { contains: q, mode: 'insensitive' } },
            { nombreArchivo: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, nombre: true, nombreArchivo: true, categoria: true },
        take: limite,
      }),
      this.prisma.anexoVigencia.findMany({
        where: {
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
