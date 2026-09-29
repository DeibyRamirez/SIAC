import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';

/** Sigla del registro único que siembra la migración 20260929040000_entidad_institucion. */
export const SIGLA_INSTITUCION_PRINCIPAL = 'CUAC';

@Injectable()
export class InstitucionRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.institucion.findMany({ orderBy: { nombre: 'asc' } });
  }

  buscarPorId(id: string) {
    return this.prisma.institucion.findUnique({ where: { id } });
  }

  buscarPorSigla(sigla: string) {
    return this.prisma.institucion.findUnique({ where: { sigla } });
  }

  buscarPrimera() {
    return this.prisma.institucion.findFirst({ orderBy: { createdAt: 'asc' } });
  }

  actualizar(id: string, datos: Prisma.InstitucionUpdateInput) {
    return this.prisma.institucion.update({ where: { id }, data: datos });
  }
}
