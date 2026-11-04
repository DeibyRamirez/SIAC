import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { ejecutarComoSistema } from '../prisma/contexto-sistema';
import {
  CategoriaCifras,
  MAXIMO_FILAS_ENVIO,
  TAMANO_LOTE_INSERCION,
  esCategoriaCifras,
} from './categorias';
import {
  ESQUEMAS_CIFRAS,
  ErrorFilaCifras,
  decimalObligatorio,
  enteroObligatorio,
  fechaObligatoria,
  leerCampo,
  textoObligatorio,
  textoOpcional,
  validarLoteCifras,
} from './esquemas-cifras';
import { ClaveIntegracionAutenticada } from './claves-integracion.service';

const COLUMNAS_SIN_PII: Record<CategoriaCifras, Prisma.Sql> = {
  estudiantes: Prisma.sql`"id", "programa", "genero", "facultad", "semestre", "estrato", "codigoEstudiante", "periodoAcademico", "createdAt", "updatedAt"`,
  profesores: Prisma.sql`"id", "programa", "genero", "facultad", "periodoInicio", "periodoFinal", "periodoAcademico", "estrato", "createdAt", "updatedAt"`,
  egresados: Prisma.sql`"id", "programa", "genero", "facultad", "graduadosPeriodo", "estrato", "grado", "nivel", "createdAt", "updatedAt"`,
  investigacion: Prisma.sql`"id", "facultad", "grupoInvestigacion", "semillero", "periodoAcademico", "cantidadEstudiantes", "genero", "programa", "createdAt", "updatedAt"`,
  aseguramiento: Prisma.sql`"id", "periodoAcademico", "programas", "facultad", "grado", "nivel", "acreditados", "acreditables", "registrosCalificables", "inicioSiac", "finalizacionSiac", "snies", "createdAt", "updatedAt"`,
  infraestructura: Prisma.sql`"id", "sede", "direccion", "numeroPisos", "estado", "totalM2AreaConstruida", "totalM2AreaTerreno", "cantidadSalonesClase", "areaM2SalonClase", "cantidadSalasSistemas", "areaM2SalasSistemas", "cantidadLaboratorios", "areaM2Laboratorios", "cantidadAuditorios", "areaM2Auditorios", "cantidadSalasLectura", "areaM2SalasLectura", "cantidadZonasDeportivas", "areaM2ZonasDeportivas", "cantidadCafeterias", "cantidadZonasEstudio", "cantidadZonasRecreativas", "createdAt", "updatedAt"`,
  bienestar: Prisma.sql`"id", "clave", "periodo", "facultad", "dimension", "valorDimension", "valor", "createdAt", "updatedAt"`,
  'relaciones-entorno': Prisma.sql`"id", "clave", "periodo", "facultad", "dimension", "valorDimension", "valor", "createdAt", "updatedAt"`,
};

const TABLAS: Record<CategoriaCifras, Prisma.Sql> = {
  estudiantes: Prisma.sql`"CifraEstudiante"`,
  profesores: Prisma.sql`"CifraProfesor"`,
  egresados: Prisma.sql`"CifraEgresado"`,
  investigacion: Prisma.sql`"CifraInvestigacion"`,
  aseguramiento: Prisma.sql`"CifraAseguramiento"`,
  infraestructura: Prisma.sql`"CifraInfraestructura"`,
  bienestar: Prisma.sql`"CifraBienestar"`,
  'relaciones-entorno': Prisma.sql`"CifraRelacionEntorno"`,
};

type Registro = Record<string, unknown>;

@Injectable()
export class CifrasInstitucionalesService {
  constructor(private readonly prisma: PrismaService) {}

  resolverCategoria(categoriaId: string): CategoriaCifras {
    if (!esCategoriaCifras(categoriaId)) {
      throw new BadRequestException(
        `Categoría no reconocida. Use: ${Object.keys(ESQUEMAS_CIFRAS).join(', ')}.`,
      );
    }
    return categoriaId;
  }

  obtenerEsquema(categoriaId: string) {
    const categoria = this.resolverCategoria(categoriaId);
    return ESQUEMAS_CIFRAS[categoria];
  }

  async registrarEnvio(
    categoriaId: string,
    periodo: string | undefined,
    registros: unknown[],
    clave: ClaveIntegracionAutenticada,
  ) {
    const categoria = this.resolverCategoria(categoriaId);
    if (categoria !== 'infraestructura' && !periodo) {
      throw new BadRequestException('El periodo es obligatorio para esta categoría.');
    }
    if (registros.length > MAXIMO_FILAS_ENVIO) {
      throw new BadRequestException('El lote no puede superar 5000 registros.');
    }
    const errores = validarLoteCifras(categoria, registros, periodo);
    if (errores.length > 0) {
      lanzarLoteInvalido(errores);
    }
    const filas = registros as Registro[];
    const periodoEfectivo =
      periodo ??
      (categoria === 'infraestructura' ? undefined : String(leerCampo(filas[0], 'periodo_academico') ?? ''));

    return ejecutarComoSistema(() =>
      this.prisma.$transaction(async (tx) => {
        await this.borrarAmbito(tx, categoria, periodoEfectivo, filas);
        const envio = await tx.envioCifras.create({
          data: {
            categoriaId: categoria,
            periodo: periodoEfectivo ?? null,
            ambito: categoria === 'infraestructura' ? sedesDelLote(filas).join(', ') : periodoEfectivo,
            filasOk: filas.length,
            claveIntegracionId: clave.id,
          },
        });
        const ahora = new Date();
        const payload = filas.map((registro) =>
          mapearFila(categoria, registro, periodoEfectivo, envio.id, ahora),
        );
        for (let i = 0; i < payload.length; i += TAMANO_LOTE_INSERCION) {
          const lote = payload.slice(i, i + TAMANO_LOTE_INSERCION);
          await insertarLote(tx, categoria, lote);
        }
        return { filasOk: filas.length, filasError: 0, errores: [] as ErrorFilaCifras[], envioId: envio.id };
      }),
    );
  }

  async listarDatos(categoriaId: string, paginaCruda?: string, tamanoCrudo?: string, periodo?: string) {
    const categoria = this.resolverCategoria(categoriaId);
    const pagina = enteroConsulta(paginaCruda, 1, 1);
    const tamano = Math.min(enteroConsulta(tamanoCrudo, 100, 1), 500);
    const saltar = (pagina - 1) * tamano;
    const tabla = TABLAS[categoria];
    const columnas = COLUMNAS_SIN_PII[categoria];
    const filtroPeriodo = filtroSqlPeriodo(categoria, periodo);
    const leer = async () => {
      const totalFilas = await this.prisma.$queryRaw<[{ n: bigint }]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS n FROM ${tabla} ${filtroPeriodo}`,
      );
      const datos = await this.prisma.$queryRaw<Record<string, unknown>[]>(
        Prisma.sql`SELECT ${columnas} FROM ${tabla} ${filtroPeriodo} ORDER BY "createdAt" DESC OFFSET ${saltar} LIMIT ${tamano}`,
      );
      return {
        datos: serializarFilas(datos),
        pagina,
        tamano,
        total: Number(totalFilas[0]?.n ?? 0),
      };
    };
    return ejecutarComoSistema(leer);
  }

  private async borrarAmbito(
    tx: Prisma.TransactionClient,
    categoria: CategoriaCifras,
    periodo: string | undefined,
    filas: Registro[],
  ) {
    if (categoria === 'infraestructura') {
      const sedes = sedesDelLote(filas);
      await tx.cifraInfraestructura.deleteMany({ where: { sede: { in: sedes } } });
      return;
    }
    if (!periodo) return;
    if (categoria === 'estudiantes') {
      await tx.cifraEstudiante.deleteMany({ where: { periodoAcademico: periodo } });
    } else if (categoria === 'profesores') {
      await tx.cifraProfesor.deleteMany({ where: { periodoAcademico: periodo } });
    } else if (categoria === 'egresados') {
      await tx.cifraEgresado.deleteMany({ where: { graduadosPeriodo: periodo } });
    } else if (categoria === 'investigacion') {
      await tx.cifraInvestigacion.deleteMany({ where: { periodoAcademico: periodo } });
    } else if (categoria === 'aseguramiento') {
      await tx.cifraAseguramiento.deleteMany({ where: { periodoAcademico: periodo } });
    } else if (categoria === 'bienestar') {
      await tx.cifraBienestar.deleteMany({ where: { periodo } });
    } else {
      await tx.cifraRelacionEntorno.deleteMany({ where: { periodo } });
    }
  }
}

function lanzarLoteInvalido(errores: ErrorFilaCifras[]): never {
  throw new BadRequestException({
    statusCode: 400,
    message: 'El lote tiene filas inválidas.',
    error: 'Bad Request',
    codigo: 'CIFRAS_LOTE_INVALIDO',
    errores,
  });
}

function enteroConsulta(valor: string | undefined, porDefecto: number, minimo: number): number {
  if (valor === undefined || valor === '') return porDefecto;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < minimo) {
    throw new BadRequestException('pagina y tamano deben ser enteros positivos.');
  }
  return n;
}

function sedesDelLote(filas: Registro[]): string[] {
  return [...new Set(filas.map((fila) => textoObligatorio(fila, 'sede')))];
}

function filtroSqlPeriodo(categoria: CategoriaCifras, periodo?: string): Prisma.Sql {
  if (!periodo) return Prisma.empty;
  if (categoria === 'infraestructura') return Prisma.empty;
  if (categoria === 'egresados') return Prisma.sql`WHERE "graduadosPeriodo" = ${periodo}`;
  if (categoria === 'bienestar' || categoria === 'relaciones-entorno') {
    return Prisma.sql`WHERE "periodo" = ${periodo}`;
  }
  return Prisma.sql`WHERE "periodoAcademico" = ${periodo}`;
}

function serializarFilas(filas: Record<string, unknown>[]): Record<string, unknown>[] {
  return filas.map((fila) => {
    const salida: Record<string, unknown> = {};
    for (const [clave, valor] of Object.entries(fila)) {
      if (valor instanceof Date) salida[clave] = valor.toISOString();
      else if (typeof valor === 'bigint') salida[clave] = Number(valor);
      else if (valor !== null && typeof valor === 'object' && 'toNumber' in valor) {
        salida[clave] = Number(valor);
      } else salida[clave] = valor;
    }
    return salida;
  });
}

function periodoDeFila(registro: Registro, clave: string, respaldo?: string): string {
  return textoObligatorio(registro, clave, respaldo);
}

function mapearFila(
  categoria: CategoriaCifras,
  registro: Registro,
  periodo: string | undefined,
  envioId: string,
  ahora: Date,
): Record<string, unknown> {
  const base = { envioId, createdAt: ahora, updatedAt: ahora };
  if (categoria === 'estudiantes') {
    return {
      ...base,
      nombreEstudiante: textoOpcional(registro, 'nombre_estudiante'),
      programa: textoObligatorio(registro, 'programa'),
      genero: textoObligatorio(registro, 'genero'),
      facultad: textoObligatorio(registro, 'facultad'),
      semestre: enteroObligatorio(registro, 'semestre'),
      estrato: enteroObligatorio(registro, 'estrato'),
      codigoEstudiante: textoObligatorio(registro, 'codigo_estudiante'),
      periodoAcademico: periodoDeFila(registro, 'periodo_academico', periodo),
    };
  }
  if (categoria === 'profesores') {
    return {
      ...base,
      nombreProfesor: textoOpcional(registro, 'nombre_profesor'),
      programa: textoObligatorio(registro, 'programa'),
      genero: textoObligatorio(registro, 'genero'),
      facultad: textoObligatorio(registro, 'facultad'),
      periodoInicio: textoObligatorio(registro, 'periodo_inicio'),
      periodoFinal: textoOpcional(registro, 'periodo_final'),
      periodoAcademico: periodoDeFila(registro, 'periodo_academico', periodo),
      estrato: enteroObligatorio(registro, 'estrato'),
    };
  }
  if (categoria === 'egresados') {
    return {
      ...base,
      nombreEgresado: textoOpcional(registro, 'nombre_egresado'),
      programa: textoObligatorio(registro, 'programa'),
      genero: textoObligatorio(registro, 'genero'),
      facultad: textoObligatorio(registro, 'facultad'),
      graduadosPeriodo: periodoDeFila(registro, 'graduados_periodo', periodo),
      estrato: enteroObligatorio(registro, 'estrato'),
      grado: textoObligatorio(registro, 'grado'),
      nivel: textoObligatorio(registro, 'nivel'),
    };
  }
  if (categoria === 'investigacion') {
    return {
      ...base,
      facultad: textoObligatorio(registro, 'facultad'),
      grupoInvestigacion: textoObligatorio(registro, 'grupo_investigacion'),
      semillero: textoObligatorio(registro, 'semillero'),
      periodoAcademico: periodoDeFila(registro, 'periodo_academico', periodo),
      cantidadEstudiantes: enteroObligatorio(registro, 'cantidad_estudiantes'),
      genero: textoObligatorio(registro, 'genero'),
      programa: textoObligatorio(registro, 'programa'),
    };
  }
  if (categoria === 'aseguramiento') {
    return {
      ...base,
      periodoAcademico: periodoDeFila(registro, 'periodo_academico', periodo),
      programas: textoObligatorio(registro, 'programas'),
      facultad: textoObligatorio(registro, 'facultad'),
      grado: textoObligatorio(registro, 'grado'),
      nivel: textoObligatorio(registro, 'nivel'),
      acreditados: enteroObligatorio(registro, 'acreditados'),
      acreditables: enteroObligatorio(registro, 'acreditables'),
      registrosCalificables: enteroObligatorio(registro, 'registros_calificables'),
      inicioSiac: fechaObligatoria(registro, 'inicio_siac'),
      finalizacionSiac: fechaObligatoria(registro, 'finalizacion_siac'),
      snies: textoObligatorio(registro, 'snies'),
    };
  }
  if (categoria === 'infraestructura') {
    return {
      ...base,
      sede: textoObligatorio(registro, 'sede'),
      direccion: textoObligatorio(registro, 'direccion'),
      numeroPisos: enteroObligatorio(registro, 'numero_pisos'),
      estado: textoObligatorio(registro, 'estado'),
      totalM2AreaConstruida: decimalObligatorio(registro, 'total_m2_area_construida'),
      totalM2AreaTerreno: decimalObligatorio(registro, 'total_m2_area_terreno'),
      cantidadSalonesClase: enteroObligatorio(registro, 'cantidad_salones_clase'),
      areaM2SalonClase: decimalObligatorio(registro, 'area_m2_salon_clase'),
      cantidadSalasSistemas: enteroObligatorio(registro, 'cantidad_salas_sistemas'),
      areaM2SalasSistemas: decimalObligatorio(registro, 'area_m2_salas_sistemas'),
      cantidadLaboratorios: enteroObligatorio(registro, 'cantidad_laboratorios'),
      areaM2Laboratorios: decimalObligatorio(registro, 'area_m2_laboratorios'),
      cantidadAuditorios: enteroObligatorio(registro, 'cantidad_auditorios'),
      areaM2Auditorios: decimalObligatorio(registro, 'area_m2_auditorios'),
      cantidadSalasLectura: enteroObligatorio(registro, 'cantidad_salas_lectura'),
      areaM2SalasLectura: decimalObligatorio(registro, 'area_m2_salas_lectura'),
      cantidadZonasDeportivas: enteroObligatorio(registro, 'cantidad_zonas_deportivas'),
      areaM2ZonasDeportivas: decimalObligatorio(registro, 'area_m2_zonas_deportivas'),
      cantidadCafeterias: enteroObligatorio(registro, 'cantidad_cafeterias'),
      cantidadZonasEstudio: enteroObligatorio(registro, 'cantidad_zonas_estudio'),
      cantidadZonasRecreativas: enteroObligatorio(registro, 'cantidad_zonas_recreativas'),
    };
  }
  const claveValor = {
    ...base,
    clave: textoObligatorio(registro, 'clave'),
    periodo: periodoDeFila(registro, 'periodo', periodo),
    facultad: textoObligatorio(registro, 'facultad'),
    dimension: textoObligatorio(registro, 'dimension'),
    valorDimension: textoObligatorio(registro, 'valor_dimension'),
    valor: decimalObligatorio(registro, 'valor'),
  };
  return claveValor;
}

async function insertarLote(
  tx: Prisma.TransactionClient,
  categoria: CategoriaCifras,
  lote: Record<string, unknown>[],
) {
  if (categoria === 'estudiantes') await tx.cifraEstudiante.createMany({ data: lote as never });
  else if (categoria === 'profesores') await tx.cifraProfesor.createMany({ data: lote as never });
  else if (categoria === 'egresados') await tx.cifraEgresado.createMany({ data: lote as never });
  else if (categoria === 'investigacion') await tx.cifraInvestigacion.createMany({ data: lote as never });
  else if (categoria === 'aseguramiento') await tx.cifraAseguramiento.createMany({ data: lote as never });
  else if (categoria === 'infraestructura') await tx.cifraInfraestructura.createMany({ data: lote as never });
  else if (categoria === 'bienestar') await tx.cifraBienestar.createMany({ data: lote as never });
  else await tx.cifraRelacionEntorno.createMany({ data: lote as never });
}
