import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class EstructuraService {
  constructor(private readonly prisma: PrismaService) {}

  listarEtapas() {
    return this.prisma.etapaAcreditacion.findMany({
      include: { carpetas: { include: { documentos: true }, orderBy: { orden: 'asc' } } },
      orderBy: { orden: 'asc' },
    });
  }

  crearEtapa(datos: { nombre: string; tipo: string; descripcion: string; orden: number }) {
    return this.prisma.etapaAcreditacion.create({ data: datos });
  }

  actualizarEtapa(id: string, datos: Partial<{ nombre: string; descripcion: string; activa: boolean; orden: number }>) {
    return this.prisma.etapaAcreditacion.update({ where: { id }, data: datos });
  }

  eliminarEtapa(id: string) {
    return this.prisma.etapaAcreditacion.delete({ where: { id } });
  }

  crearCarpeta(datos: { etapaId: string; condicionId?: string; nombre: string; descripcion: string; orden: number }) {
    return this.prisma.carpetaNormativa.create({ data: datos });
  }

  actualizarCarpeta(id: string, datos: Partial<{ nombre: string; descripcion: string; activa: boolean; orden: number }>) {
    return this.prisma.carpetaNormativa.update({ where: { id }, data: datos });
  }

  eliminarCarpeta(id: string) {
    return this.prisma.carpetaNormativa.delete({ where: { id } });
  }

  crearDocumento(datos: {
    carpetaId: string;
    nombre: string;
    esPlantilla: boolean;
    formato: 'PDF' | 'DOCX' | 'XLSX';
    obligatorio: boolean;
    orden: number;
  }) {
    return this.prisma.documentoRequerido.create({ data: datos });
  }

  actualizarDocumento(id: string, datos: Partial<{ nombre: string; obligatorio: boolean; orden: number }>) {
    return this.prisma.documentoRequerido.update({ where: { id }, data: datos });
  }

  eliminarDocumento(id: string) {
    return this.prisma.documentoRequerido.delete({ where: { id } });
  }
}
