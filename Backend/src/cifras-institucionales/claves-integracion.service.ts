import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { ActualizarClaveIntegracionDto, CrearClaveIntegracionDto } from './dto/clave-integracion.dto';
import { generarSecretoClaveIntegracion, hashearClaveIntegracion, hashesCoinciden } from './secreto-clave-integracion';

export interface ClaveIntegracionAutenticada {
  id: string;
  nombre: string;
  categorias: string[];
}

@Injectable()
export class ClavesIntegracionService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearClaveIntegracionDto, creadaPorId: string) {
    const generado = generarSecretoClaveIntegracion();
    const fila = await this.prisma.claveIntegracion.create({
      data: {
        nombre: dto.nombre.trim(),
        prefijo: generado.prefijo,
        hash: generado.hash,
        categorias: dto.categorias,
        creadaPorId,
      },
    });
    return {
      id: fila.id,
      nombre: fila.nombre,
      prefijo: fila.prefijo,
      categorias: fila.categorias,
      activa: fila.activa,
      createdAt: fila.createdAt,
      secreto: generado.secreto,
    };
  }

  listar() {
    return this.prisma.claveIntegracion.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nombre: true,
        prefijo: true,
        categorias: true,
        activa: true,
        ultimoUsoAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async actualizar(id: string, dto: ActualizarClaveIntegracionDto) {
    const existente = await this.prisma.claveIntegracion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('La clave de integración no existe.');
    return this.prisma.claveIntegracion.update({
      where: { id },
      data: {
        ...(dto.activa !== undefined ? { activa: dto.activa } : {}),
        ...(dto.categorias ? { categorias: dto.categorias } : {}),
      },
      select: {
        id: true,
        nombre: true,
        prefijo: true,
        categorias: true,
        activa: true,
        ultimoUsoAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async revocar(id: string) {
    const existente = await this.prisma.claveIntegracion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('La clave de integración no existe.');
    await this.prisma.claveIntegracion.update({ where: { id }, data: { activa: false } });
  }

  async autenticar(secreto: string | undefined): Promise<ClaveIntegracionAutenticada | null> {
    if (!secreto?.trim()) return null;
    const hash = hashearClaveIntegracion(secreto.trim());
    const fila = await this.prisma.claveIntegracion.findUnique({ where: { hash } });
    if (!fila || !fila.activa || !hashesCoinciden(fila.hash, hash)) return null;
    await this.prisma.claveIntegracion.update({
      where: { id: fila.id },
      data: { ultimoUsoAt: new Date() },
    });
    return { id: fila.id, nombre: fila.nombre, categorias: fila.categorias };
  }
}
