import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { EstadoEvidencia, EstadoVigencia } from '@prisma/client';

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
  ) {}

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
        const porcentajeAvance =
          totalEvidencias > 0
            ? Math.round((evidenciasValidadas / totalEvidencias) * 100)
            : 0;

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
