import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { ejecutarComoIntegracion } from '../prisma/contexto-integracion';
import { DELEGADO_PRISMA, esCategoriaCifras, obtenerEsquemaCifras } from './esquemas/indice';
import { esPeriodoValido, MENSAJE_PERIODO_INVALIDO } from './esquemas/periodo';
import { EsquemaCategoriaCifras } from './esquemas/tipos';
import { LIMITE_LOTE_CIFRAS, validarLoteCifras } from './esquemas/validador';
import { proyectarLecturaCifra } from './lectura-cifras';

export interface ResultadoEnvioCifras {
  filasOk: number;
  filasError: number;
  errores: Array<{ fila: number; columna: string; mensaje: string }>;
}

export interface PaginaCifras {
  datos: Record<string, unknown>[];
  total: number;
  pagina: number;
  limite: number;
}

interface DelegadoCifras {
  deleteMany(args: { where: Record<string, unknown> }): Promise<unknown>;
  createMany(args: { data: Record<string, unknown>[] }): Promise<unknown>;
  count(args: { where: Record<string, unknown> }): Promise<number>;
  findMany(args: {
    where: Record<string, unknown>;
    skip: number;
    take: number;
    orderBy: Array<Record<string, 'asc'>>;
  }): Promise<Record<string, unknown>[]>;
}

function delegado(cliente: object, nombre: string): DelegadoCifras {
  return (cliente as unknown as Record<string, DelegadoCifras>)[nombre];
}

function campoAmbito(esquema: EsquemaCategoriaCifras): string {
  const columna = esquema.columnas.find((item) => item.clave === esquema.claveReemplazo);
  if (!columna) throw new Error(`La categoría ${esquema.categoriaId} no tiene ámbito.`);
  return columna.campoPrisma;
}

function datosPrisma(
  esquema: EsquemaCategoriaCifras,
  datos: Record<string, unknown>,
  integradorId: string,
  enviadoEn: Date,
): Record<string, unknown> {
  const fila: Record<string, unknown> = { integradorId, enviadoEn };
  for (const columna of esquema.columnas) {
    fila[columna.campoPrisma] = datos[columna.clave] ?? null;
  }
  return fila;
}

function enteroConsulta(valor: string | undefined, nombre: string, defecto: number, maximo?: number): number {
  if (valor === undefined || valor === '') return defecto;
  if (!/^\d+$/.test(valor)) {
    throw new BadRequestException(`${nombre} debe ser un número entero.`);
  }
  const numero = parseInt(valor, 10);
  if (numero < 1) {
    throw new BadRequestException(`${nombre} debe ser un número entero.`);
  }
  if (maximo !== undefined && numero > maximo) {
    throw new BadRequestException(`${nombre} no puede ser mayor que ${maximo}.`);
  }
  return numero;
}

@Injectable()
export class CifrasInstitucionalesService {
  constructor(private readonly prisma: PrismaService) {}

  async enviar(
    categoria: string,
    cuerpo: { periodo?: string; registros: unknown[] },
    integradorId: string,
  ): Promise<ResultadoEnvioCifras> {
    const esquema = this.esquemaO404(categoria);
    if (cuerpo.registros.length > LIMITE_LOTE_CIFRAS) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
          message: `El lote supera el máximo de ${LIMITE_LOTE_CIFRAS} registros.`,
          error: 'Payload Too Large',
        },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
    const periodo = cuerpo.periodo?.trim();
    if (periodo && esquema.claveReemplazo !== 'sede' && !esPeriodoValido(periodo)) {
      throw new BadRequestException(MENSAJE_PERIODO_INVALIDO);
    }

    const validacion = validarLoteCifras(esquema, cuerpo.registros, periodo || undefined);
    if (validacion.errores.length > 0) {
      throw new BadRequestException({
        filasOk: validacion.filasOk,
        filasError: validacion.filasError,
        errores: validacion.errores,
      });
    }

    const ambito = validacion.filas[0]?.ambito;
    if (!ambito) {
      throw new BadRequestException('El lote no contiene registros.');
    }

    const nombre = DELEGADO_PRISMA[esquema.categoriaId as keyof typeof DELEGADO_PRISMA];
    const campo = campoAmbito(esquema);
    const enviadoEn = new Date();
    await ejecutarComoIntegracion(() =>
      this.prisma.$transaction(
        async (tx) => {
          const modelo = delegado(tx, nombre);
          await modelo.deleteMany({ where: { [campo]: ambito } });
          await modelo.createMany({
            data: validacion.filas.map((fila) =>
              datosPrisma(esquema, fila.datos, integradorId, enviadoEn),
            ),
          });
        },
        { timeout: 20_000 },
      ),
    );

    return { filasOk: validacion.filasOk, filasError: 0, errores: [] };
  }

  async listar(
    categoria: string,
    consulta: { pagina?: string; limite?: string; periodo?: string; sede?: string },
  ): Promise<PaginaCifras> {
    const esquema = this.esquemaO404(categoria);
    const pagina = enteroConsulta(consulta.pagina, 'pagina', 1);
    const limite = enteroConsulta(consulta.limite, 'limite', 20, 500);
    const periodo = consulta.periodo?.trim() || undefined;
    const sede = consulta.sede?.trim() || undefined;

    if (sede && esquema.claveReemplazo !== 'sede') {
      throw new BadRequestException('Esta categoría no se filtra por sede.');
    }
    if (periodo && esquema.claveReemplazo === 'sede') {
      throw new BadRequestException('La infraestructura no se filtra por periodo.');
    }
    if (periodo && !esPeriodoValido(periodo)) {
      throw new BadRequestException(MENSAJE_PERIODO_INVALIDO);
    }

    const where: Record<string, unknown> = {};
    const campo = campoAmbito(esquema);
    if (periodo) where[campo] = periodo;
    if (sede) where[campo] = sede;

    const nombre = DELEGADO_PRISMA[esquema.categoriaId as keyof typeof DELEGADO_PRISMA];
    const [total, filas] = await ejecutarComoIntegracion(() => {
      const modelo = delegado(this.prisma, nombre);
      return Promise.all([
        modelo.count({ where }),
        modelo.findMany({
          where,
          skip: (pagina - 1) * limite,
          take: limite,
          orderBy: [{ [campo]: 'asc' }, { id: 'asc' }],
        }),
      ]);
    });

    return {
      datos: filas.map((fila) => proyectarLecturaCifra(esquema, fila)),
      total,
      pagina,
      limite,
    };
  }

  private esquemaO404(categoria: string): EsquemaCategoriaCifras {
    const esquema = obtenerEsquemaCifras(categoria);
    if (!esquema || !esCategoriaCifras(categoria)) {
      throw new NotFoundException('La categoría no existe.');
    }
    return esquema;
  }
}
