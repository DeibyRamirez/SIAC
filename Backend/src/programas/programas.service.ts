import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { EstadoEvidencia, EstadoVigencia, OrigenDato } from '@prisma/client';
import { CrearProgramaDto } from './dto/crear-programa.dto';
import { AvanceProgramaService } from './avance-programa.service';

@Injectable()
export class ProgramaRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.programa.findMany({ orderBy: { nombre: 'asc' } });
  }

  buscarPorId(id: string) {
    return this.prisma.programa.findUnique({
      where: { id },
      include: {
        evidencias: { where: { estado: EstadoEvidencia.Validado } },
        anexos: true,
      },
    });
  }
}

@Injectable()
export class ProgramasService {
  constructor(
    private readonly programaRepo: ProgramaRepositorio,
    private readonly prisma: PrismaService,
    private readonly avancePrograma: AvanceProgramaService,
  ) {}

  async crear(dto: CrearProgramaDto) {
    const codigoBase = dto.nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 12)
      .toUpperCase();

    let codigo = codigoBase || 'PROG';
    let intento = 0;
    while (intento < 20) {
      const existe = await this.prisma.programa.findUnique({ where: { codigo } });
      if (!existe) break;
      intento += 1;
      codigo = `${codigoBase.slice(0, 8)}-${intento}`.slice(0, 20);
    }

    if (intento >= 20) {
      throw new ConflictException('No se pudo generar un código único para el programa.');
    }

    return this.prisma.programa.create({
      data: {
        nombre: dto.nombre.trim(),
        codigo,
        nivel: dto.nivel,
        origenDato: OrigenDato.Manual,
        semaforo: 'Verde',
        porcentajeAvance: 0,
        estadoProceso: 'En curso',
      },
    });
  }

  recalcularAvancePrograma(programaId: string) {
    return this.avancePrograma.recalcularPorcentajeAvance(programaId);
  }

  async listarConSemaforo() {
    const programas = await this.programaRepo.listar();

    return Promise.all(
      programas.map(async (programa) => {
        const anexos = await this.prisma.anexoVigencia.findMany({
          where: { programaId: programa.id },
        });

        const evidenciasValidadas = await this.prisma.evidencia.count({
          where: { programaId: programa.id, estado: EstadoEvidencia.Validado },
        });

        const totalEvidencias = await this.prisma.evidencia.count({
          where: { programaId: programa.id },
        });

        const semaforo = this.calcularSemaforo(anexos);
        const porcentajeAvance = await this.avancePrograma.recalcularPorcentajeAvance(
          programa.id,
        );

        return {
          ...programa,
          semaforo,
          porcentajeAvance,
          evidenciasValidadas,
          totalEvidencias,
        };
      }),
    );
  }

  /** RN-003: anexo de infraestructura vencido → semáforo rojo */
  private calcularSemaforo(anexos: { estado: EstadoVigencia; tipo: string }[]): string {
    const infraVencido = anexos.some(
      (a) =>
        a.estado === EstadoVigencia.Vencido &&
        a.tipo.toLowerCase().includes('infraestructura'),
    );
    if (infraVencido) return 'Rojo';

    const algunoProximo = anexos.some((a) => a.estado === EstadoVigencia.Proximo);
    if (algunoProximo) return 'Amarillo';

    const algunoVencido = anexos.some((a) => a.estado === EstadoVigencia.Vencido);
    if (algunoVencido) return 'Rojo';

    return 'Verde';
  }
}
