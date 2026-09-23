import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { Plantilla, Prisma } from '@prisma/client';

@Injectable()
export class PlantillaRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  crear(datos: Prisma.PlantillaCreateInput): Promise<Plantilla> {
    return this.prisma.plantilla.create({ data: datos });
  }

  listar(soloVigentes = false, tipoTramite?: import('@prisma/client').TipoTramitePlantilla) {
    return this.prisma.plantilla.findMany({
      where: {
        ...(soloVigentes ? { vigente: true } : {}),
        ...(tipoTramite ? { tipoTramite } : {}),
      },
      orderBy: [{ factor: 'asc' }, { version: 'desc' }],
    });
  }

  buscarPorId(id: string) {
    return this.prisma.plantilla.findUnique({ where: { id } });
  }

  marcarAnterioresNoVigentes(factor: string, excluirId?: string) {
    return this.prisma.plantilla.updateMany({
      where: {
        factor,
        vigente: true,
        ...(excluirId ? { id: { not: excluirId } } : {}),
      },
      data: { vigente: false },
    });
  }

  actualizar(id: string, datos: Prisma.PlantillaUpdateInput) {
    return this.prisma.plantilla.update({ where: { id }, data: datos });
  }

  eliminar(id: string) {
    return this.prisma.plantilla.delete({ where: { id } });
  }
}
