import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FuenteCifra, Prisma, Programa, VariableCifra } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import {
  CATEGORIAS_CIFRAS,
  esCategoriaCifrasValida,
  fuenteCifrasDto,
  tituloCategoriaCifras,
} from './catalogo-categorias';
import { CifrasRepositorio, DatosCifraIndicador } from './cifras.repositorio';
import {
  ErrorFilaIngestaDto,
  FuenteCifras,
  RespuestaIngestaCifrasDto,
} from './dto/cifras.dto';
import { IngestaCifrasDto } from './dto/ingesta-cifras.dto';
import { esPeriodoValido, MENSAJE_PERIODO_INVALIDO } from './periodo-cifras';

export const MIME_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const MAX_BYTES_XLSX = 5 * 1024 * 1024;

interface FilaIngesta {
  fila: number;
  clave: string;
  valor: number | string | undefined;
  periodo: string;
  facultad?: string;
  programaCodigoSnies?: string;
  sede?: string;
  dimension?: string;
  valorDimension?: string;
}

const COLUMNAS_PLANTILLA = [
  'clave',
  'periodo',
  'facultad',
  'codigo_snies',
  'sede',
  'dimension',
  'valor_dimension',
  'valor',
] as const;

type ColumnaPlantilla = (typeof COLUMNAS_PLANTILLA)[number];

const COINCIDENCIAS_ENCABEZADO: Record<ColumnaPlantilla, string[]> = {
  clave: ['clave'],
  periodo: ['periodo'],
  facultad: ['facultad'],
  codigo_snies: ['codigo_snies', 'codigo snies', 'programa_codigo_snies', 'snies'],
  sede: ['sede'],
  dimension: ['dimension', 'dimensión'],
  valor_dimension: ['valor_dimension', 'valor dimensión', 'valor dimension'],
  valor: ['valor'],
};

function normalizarEncabezado(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u');
}

function textoCelda(celda: ExcelJS.Cell): string {
  const valor = celda.value;
  if (valor === null || valor === undefined) {
    return '';
  }
  if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
    return String(valor).trim();
  }
  if (valor instanceof Date) {
    return valor.toISOString();
  }
  if (typeof valor === 'object') {
    const objeto = valor as {
      text?: string;
      result?: unknown;
      richText?: Array<{ text: string }>;
      formula?: string;
    };
    if (typeof objeto.text === 'string') {
      return objeto.text.trim();
    }
    if (Array.isArray(objeto.richText)) {
      return objeto.richText.map((fragmento) => fragmento.text).join('').trim();
    }
    if (objeto.result !== undefined && objeto.result !== null) {
      return String(objeto.result).trim();
    }
  }
  return String(valor).trim();
}

function valorCrudoCelda(celda: ExcelJS.Cell): number | string | undefined {
  const valor = celda.value;
  if (valor === null || valor === undefined) {
    return undefined;
  }
  if (typeof valor === 'number') {
    return valor;
  }
  if (typeof valor === 'object') {
    const objeto = valor as { result?: unknown };
    if (typeof objeto.result === 'number') {
      return objeto.result;
    }
  }
  return textoCelda(celda);
}

@Injectable()
export class CifrasImportacionService {
  constructor(private readonly repositorio: CifrasRepositorio) {}

  async generarPlantilla(
    categoriaId: string,
  ): Promise<{ buffer: Buffer; nombreArchivo: string; mimeType: string }> {
    this.validarCategoria(categoriaId);

    const variables = await this.repositorio.listarVariablesActivas(categoriaId);
    if (variables.length === 0) {
      throw new NotFoundException(
        `La categoría «${tituloCategoriaCifras(categoriaId)}» no tiene variables activas. Ejecute la semilla de cifras.`,
      );
    }

    const libro = new ExcelJS.Workbook();
    libro.creator = 'SIAC — CUAC';

    const hojaDatos = libro.addWorksheet('datos');
    hojaDatos.columns = COLUMNAS_PLANTILLA.map((columna) => ({
      header: columna,
      key: columna,
      width: columna === 'clave' ? 34 : columna === 'valor' ? 14 : 20,
    }));

    const hojaVariables = libro.addWorksheet('variables');
    hojaVariables.columns = [
      { header: 'clave', key: 'clave', width: 34 },
      { header: 'etiqueta CUAC', key: 'etiqueta', width: 40 },
      { header: 'unidad', key: 'unidad', width: 14 },
      { header: 'dimensiones permitidas', key: 'dimensiones', width: 30 },
    ];
    for (const variable of variables) {
      hojaVariables.addRow({
        clave: variable.clave,
        etiqueta: variable.etiquetaCuac,
        unidad: variable.unidad,
        dimensiones: variable.dimensiones.join(', '),
      });
    }

    const buffer = Buffer.from(await libro.xlsx.writeBuffer());
    return {
      buffer,
      nombreArchivo: `plantilla-cifras-${categoriaId}.xlsx`,
      mimeType: MIME_XLSX,
    };
  }

  async ingestarPorApi(
    categoriaId: string,
    dto: IngestaCifrasDto,
    usuarioId?: string,
  ): Promise<RespuestaIngestaCifrasDto> {
    this.validarCategoria(categoriaId);

    const filas: FilaIngesta[] = dto.registros.map((registro, indice) => ({
      fila: indice + 1,
      clave: registro.clave?.trim() ?? '',
      valor: registro.valor,
      periodo: dto.periodo,
      facultad: registro.facultad?.trim(),
      programaCodigoSnies: registro.programaCodigoSnies?.trim(),
      sede: registro.sede?.trim(),
      dimension: registro.dimension?.trim(),
      valorDimension: registro.valorDimension?.trim(),
    }));

    return this.procesarFilas(categoriaId, FuenteCifra.API, filas, 'Registro', undefined, usuarioId);
  }

  async importarExcel(
    categoriaId: string,
    archivo: Express.Multer.File,
    usuarioId?: string,
  ): Promise<RespuestaIngestaCifrasDto> {
    this.validarCategoria(categoriaId);

    if (archivo.size > MAX_BYTES_XLSX) {
      throw new BadRequestException('El archivo supera el tamaño máximo de 5 MB.');
    }

    const libro = new ExcelJS.Workbook();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await libro.xlsx.load(archivo.buffer as any);
    } catch {
      throw new BadRequestException('El archivo no es un Excel .xlsx válido.');
    }

    const hoja =
      libro.worksheets.find((worksheet) => worksheet.name.trim().toLowerCase() === 'datos') ??
      libro.worksheets[0];
    if (!hoja) {
      throw new BadRequestException('El archivo Excel no contiene hojas.');
    }

    const encabezados = new Map<ColumnaPlantilla, number>();
    hoja.getRow(1).eachCell((celda, numeroColumna) => {
      const texto = normalizarEncabezado(textoCelda(celda));
      for (const columna of COLUMNAS_PLANTILLA) {
        if (COINCIDENCIAS_ENCABEZADO[columna].includes(texto)) {
          encabezados.set(columna, numeroColumna);
        }
      }
    });

    for (const requerida of ['clave', 'periodo', 'valor'] as ColumnaPlantilla[]) {
      if (!encabezados.has(requerida)) {
        throw new BadRequestException(
          `La hoja «datos» debe incluir las columnas: ${COLUMNAS_PLANTILLA.join(', ')}.`,
        );
      }
    }

    const leer = (fila: ExcelJS.Row, columna: ColumnaPlantilla): string => {
      const numeroColumna = encabezados.get(columna);
      return numeroColumna ? textoCelda(fila.getCell(numeroColumna)) : '';
    };

    const filas: FilaIngesta[] = [];
    for (let numeroFila = 2; numeroFila <= hoja.rowCount; numeroFila++) {
      const fila = hoja.getRow(numeroFila);
      const clave = leer(fila, 'clave');
      const periodo = leer(fila, 'periodo');
      const valorTexto = leer(fila, 'valor');
      const facultad = leer(fila, 'facultad');
      const codigoSnies = leer(fila, 'codigo_snies');
      const sede = leer(fila, 'sede');
      const dimension = leer(fila, 'dimension');
      const valorDimension = leer(fila, 'valor_dimension');

      if (!clave && !periodo && !valorTexto && !facultad && !codigoSnies && !sede && !dimension && !valorDimension) {
        continue;
      }

      const numeroColumnaValor = encabezados.get('valor');
      filas.push({
        fila: numeroFila,
        clave,
        periodo,
        valor: numeroColumnaValor
          ? valorCrudoCelda(fila.getCell(numeroColumnaValor))
          : valorTexto,
        facultad: facultad || undefined,
        programaCodigoSnies: codigoSnies || undefined,
        sede: sede || undefined,
        dimension: dimension || undefined,
        valorDimension: valorDimension || undefined,
      });
    }

    return this.procesarFilas(categoriaId, FuenteCifra.EXCEL, filas, 'Fila', archivo.originalname, usuarioId);
  }

  private validarCategoria(categoriaId: string): void {
    if (!esCategoriaCifrasValida(categoriaId)) {
      throw new NotFoundException(
        `La categoría «${categoriaId}» no existe. Use: ${CATEGORIAS_CIFRAS.map((categoria) => categoria.id).join(', ')}.`,
      );
    }
  }

  private async procesarFilas(
    categoriaId: string,
    fuente: FuenteCifra,
    filas: FilaIngesta[],
    etiquetaFila: 'Fila' | 'Registro',
    nombreArchivo?: string,
    usuarioId?: string,
  ): Promise<RespuestaIngestaCifrasDto> {
    const variables = await this.repositorio.listarVariables(categoriaId);
    const porClave = new Map<string, VariableCifra>(
      variables.map((variable) => [variable.clave, variable]),
    );
    const titulo = tituloCategoriaCifras(categoriaId);
    const cacheProgramas = new Map<string, Programa | null>();

    const errores: ErrorFilaIngestaDto[] = [];
    const validas: DatosCifraIndicador[] = [];

    for (const fila of filas) {
      const resultado = await this.validarFila(fila, porClave, titulo, cacheProgramas);

      if (resultado.error) {
        errores.push({
          fila: fila.fila,
          clave: fila.clave || undefined,
          motivo: `${etiquetaFila} ${fila.fila}: ${resultado.error}`,
        });
        continue;
      }

      validas.push({ ...resultado.datos!, fuente });
    }

    await this.repositorio.ejecutarTransaccion(async (tx) => {
      const carga = await this.repositorio.crearCarga(
        {
          categoriaId,
          fuente,
          nombreArchivo: nombreArchivo ?? null,
          filasOk: validas.length,
          filasError: errores.length,
          errores:
            errores.length > 0
              ? (errores as unknown as Prisma.InputJsonValue)
              : undefined,
          usuarioId: usuarioId ?? null,
        },
        tx,
      );

      for (const datos of validas) {
        await this.repositorio.reemplazarValor({ ...datos, cargaId: carga.id }, tx);
      }
    });

    return {
      filasOk: validas.length,
      filasError: errores.length,
      errores,
      fuente: fuenteCifrasDto(fuente),
    };
  }

  private async validarFila(
    fila: FilaIngesta,
    porClave: Map<string, VariableCifra>,
    tituloCategoria: string,
    cacheProgramas: Map<string, Programa | null>,
  ): Promise<{ error?: string; datos?: Omit<DatosCifraIndicador, 'fuente'> }> {
    if (!fila.clave) {
      return { error: 'no indica la clave de la variable.' };
    }

    const variable = porClave.get(fila.clave);
    if (!variable) {
      return { error: `la clave '${fila.clave}' no existe en ${tituloCategoria}.` };
    }
    if (!variable.activo) {
      return { error: `la clave '${fila.clave}' no está activa en ${tituloCategoria}.` };
    }

    if (!fila.periodo) {
      return { error: 'el periodo es obligatorio (formato AAAA o AAAA-S, ej. 2026-1).' };
    }
    if (!esPeriodoValido(fila.periodo)) {
      return { error: MENSAJE_PERIODO_INVALIDO };
    }

    const valor = this.parsearValor(fila.valor);
    if (valor === null) {
      return { error: `el valor '${fila.valor ?? ''}' no es numérico.` };
    }

    let dimension: string | null = fila.dimension?.trim() || null;
    const valorDimension: string | null = fila.valorDimension?.trim() || null;

    if (variable.dimensiones.length === 0) {
      if (dimension || valorDimension) {
        return { error: `la variable '${variable.clave}' no admite dimensiones.` };
      }
    } else if (dimension) {
      // Solo se admiten dimensiones declaradas en VariableCifra.dimensiones (sin catálogo
      // cerrado de valores, la dimensión debe existir en el diccionario de la variable).
      const canonica = this.buscarDimensionPermitida(variable.dimensiones, dimension);
      if (!canonica) {
        return {
          error: `la dimensión '${dimension}' no está permitida para '${variable.clave}' (use: ${variable.dimensiones.join(', ')}).`,
        };
      }
      dimension = canonica;
      if (!valorDimension) {
        return { error: `indique el valor de la dimensión '${dimension}'.` };
      }
    } else if (valorDimension) {
      if (variable.dimensiones.length === 1) {
        dimension = variable.dimensiones[0];
      } else {
        return {
          error: `indique la dimensión para el valor '${valorDimension}' (use: ${variable.dimensiones.join(', ')}).`,
        };
      }
    }

    let programaId: string | null = null;
    const codigoSnies = fila.programaCodigoSnies?.trim();
    if (codigoSnies) {
      if (!cacheProgramas.has(codigoSnies)) {
        cacheProgramas.set(
          codigoSnies,
          await this.repositorio.buscarProgramaPorCodigo(codigoSnies),
        );
      }
      const programa = cacheProgramas.get(codigoSnies);
      if (!programa) {
        return { error: `el programa con código '${codigoSnies}' no existe.` };
      }
      programaId = programa.id;
    }

    return {
      datos: {
        categoriaId: variable.categoriaId,
        variableId: variable.id,
        periodo: fila.periodo.trim(),
        facultad: fila.facultad?.trim() || null,
        programaId,
        sede: fila.sede?.trim() || null,
        dimension,
        valorDimension,
        valor,
      },
    };
  }

  /** Coincidencia tolerante (mayúsculas/acentos) contra las dimensiones declaradas. */
  private buscarDimensionPermitida(
    permitidas: string[],
    dimension: string,
  ): string | null {
    const objetivo = this.normalizarDimension(dimension);
    return (
      permitidas.find(
        (permitida) => this.normalizarDimension(permitida) === objetivo,
      ) ?? null
    );
  }

  private normalizarDimension(texto: string): string {
    return texto
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private parsearValor(valor: number | string | undefined): number | null {
    if (valor === null || valor === undefined) {
      return null;
    }
    if (typeof valor === 'number') {
      return Number.isFinite(valor) ? valor : null;
    }
    const texto = valor.trim().replace(',', '.');
    if (!texto) {
      return null;
    }
    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : null;
  }
}
