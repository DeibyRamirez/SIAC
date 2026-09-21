import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.module';
import { EstadoEvidencia } from '@prisma/client';

interface FilaExcel {
  fila: number;
  nombre?: string;
  programaCodigo?: string;
  periodo?: string;
  factor?: string;
  indicador?: string;
}

@Injectable()
export class IngestaService {
  constructor(private readonly prisma: PrismaService) {}

  async parsearExcel(
    buffer: Buffer,
    autorId: string,
  ): Promise<{
    registrosProcesados: number;
    registrosExitosos: number;
    registrosFallidos: number;
    errores: { fila: number; motivo: string }[];
  }> {
    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);

    const hoja = workbook.worksheets[0];
    if (!hoja) {
      throw new BadRequestException('El archivo Excel no contiene hojas.');
    }

    const errores: { fila: number; motivo: string }[] = [];
    let exitosos = 0;
    let procesados = 0;

    for (let numeroFila = 2; numeroFila <= hoja.rowCount; numeroFila++) {
      const fila = hoja.getRow(numeroFila);
      if (fila.cellCount === 0) continue;

      procesados++;
      const datos: FilaExcel = {
        fila: numeroFila,
        nombre: String(fila.getCell(1).value ?? '').trim(),
        programaCodigo: String(fila.getCell(2).value ?? '').trim(),
        periodo: String(fila.getCell(3).value ?? '').trim(),
        factor: String(fila.getCell(4).value ?? '').trim(),
        indicador: String(fila.getCell(5).value ?? '').trim(),
      };

      if (!datos.nombre) {
        errores.push({ fila: numeroFila, motivo: "Campo 'nombre' vacío" });
        continue;
      }
      if (!datos.programaCodigo) {
        errores.push({ fila: numeroFila, motivo: "Campo 'programa' vacío" });
        continue;
      }
      if (!datos.periodo || !datos.factor || !datos.indicador) {
        errores.push({
          fila: numeroFila,
          motivo: 'Metadatos incompletos (periodo, factor o indicador)',
        });
        continue;
      }

      try {
        await this.crearEvidenciaDesdeFila(datos, autorId);
        exitosos++;
      } catch {
        errores.push({
          fila: numeroFila,
          motivo: 'Programa no encontrado o error al guardar',
        });
      }
    }

    return {
      registrosProcesados: procesados,
      registrosExitosos: exitosos,
      registrosFallidos: errores.length,
      errores,
    };
  }

  private async crearEvidenciaDesdeFila(datos: FilaExcel, autorId: string) {
    const programa = await this.prisma.programa.findUnique({
      where: { codigo: datos.programaCodigo },
    });

    if (!programa) {
      throw new Error('Programa no encontrado');
    }

    const autor = await this.prisma.usuario.findUnique({ where: { id: autorId } });

    await this.prisma.evidencia.create({
      data: {
        nombre: datos.nombre!,
        programaId: programa.id,
        periodo: datos.periodo!,
        factor: datos.factor!,
        indicador: datos.indicador!,
        estado: EstadoEvidencia.Borrador,
        autorId,
        nombreArchivo: `${datos.nombre}.xlsx`,
        responsable: autor?.nombre,
      },
    });
  }
}
