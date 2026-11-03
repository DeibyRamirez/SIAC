import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { generarClaveApi } from './hash-clave';

const SELECCION_INTEGRADOR = {
  id: true,
  nombre: true,
  activo: true,
  ultimoUsoEn: true,
  revocadoEn: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.IntegradorSelect;

export interface IntegradorPublico {
  id: string;
  nombre: string;
  activo: boolean;
  ultimoUsoEn: Date | null;
  revocadoEn: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ClavesIntegracionService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(nombre: string): Promise<IntegradorPublico & { clave: string }> {
    const { clave, hashClave } = generarClaveApi();
    const creado = await this.prisma.integrador.create({
      data: { nombre: nombre.trim(), hashClave },
      select: SELECCION_INTEGRADOR,
    });
    return { ...creado, clave };
  }

  listar(): Promise<IntegradorPublico[]> {
    return this.prisma.integrador.findMany({
      select: SELECCION_INTEGRADOR,
      orderBy: { createdAt: 'desc' },
    });
  }

  async revocar(id: string): Promise<IntegradorPublico> {
    const actual = await this.prisma.integrador.findUnique({
      where: { id },
      select: { id: true, activo: true },
    });
    if (!actual) throw new NotFoundException('El integrador no existe.');
    if (!actual.activo) {
      return this.prisma.integrador.findUniqueOrThrow({
        where: { id },
        select: SELECCION_INTEGRADOR,
      });
    }
    return this.prisma.integrador.update({
      where: { id },
      data: { activo: false, revocadoEn: new Date() },
      select: SELECCION_INTEGRADOR,
    });
  }
}
