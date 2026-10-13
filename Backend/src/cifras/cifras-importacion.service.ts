import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FuenteCifra, Programa, Prisma, VariableCifra } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import {
  CATEGORIAS_CIFRAS,
  esCategoriaCifrasValida,
  fuenteCifrasDto,
  tituloCategoriaCifras,
} from './catalogo-categorias';
import { CifrasRegistrosRepositorio } from './cifras-registros.repositorio';
import { CifrasRepositorio, DatosCifraIndicador } from './cifras.repositorio';
import {
  ColumnaEsquemaCifras,
  columnasPersistidas,
  ErrorValidacionCifras,
  esCategoriaDeRegistros,
  EsquemaCategoriaCifras,
  FilaCrudaCifras,
  mapaColumnasEsquema,
  normalizarClaveCifras,
  obtenerEsquemaCategoria,
  validarFilaCifras,
} from './esquemas/indice';
import {
  ErrorFilaIngestaDto,
  FuenteCifras,
  PlantillaJsonCifrasDto,
  RespuestaIngestaCifrasDto,
} from './dto/cifras.dto';
import { IngestaCifrasDto } from './dto/ingesta-cifras.dto';
import { esPeriodoValido, MENSAJE_PERIODO_INVALIDO } from './periodo-cifras';

export const MIME_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const MAX_BYTES_XLSX = 20 * 1024 * 1024;

interface FilaClaveValor {
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

const COLUMNAS_PLANTILLA_CLAVE_VALOR = [
  'clave',
  'periodo',
  'facultad',
  'codigo_snies',
  'sede',
  'dimension',
  'valor_dimension',
  'valor',
] as const;

type ColumnaPlantillaClaveValor = (typeof COLUMNAS_PLANTILLA_CLAVE_VALOR)[number];

const COINCIDENCIAS_ENCABEZADO: Record<ColumnaPlantillaClaveValor, string[]> = {
  clave: ['clave'],
  periodo: ['periodo'],
  facultad: ['facultad'],
  codigo_snies: ['codigo_snies', 'codigo snies', 'programa_codigo_snies', 'snies'],
  sede: ['sede'],
  dimension: ['dimension', 'dimensión'],
  valor_dimension: ['valor_dimension', 'valor dimensión', 'valor dimension'],
  valor: ['valor'],
};

const FORMATOS_COLUMNA: Record<string, string> = {
  texto: '@',
  periodo: '@',
  codigo: '@',
  enum: '@',
  fecha: 'yyyy-mm-dd',
  entero: '#,##0',
  decimal: '#,##0.00',
};

function textoCelda(celda: ExcelJS.Cell): string {
  const valor = celda.value;
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor).trim();
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === 'object') {
    const objeto = valor as {
      text?: unknown;
      result?: unknown;
      richText?: Array<{ text: string }>;
      error?: unknown;
    };
    if (typeof objeto.text === 'string') return objeto.text.trim();
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
  if (valor === null || valor === undefined) return undefined;
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'object' && !(valor instanceof Date)) {
    const objeto = valor as { result?: unknown };
    if (typeof objeto.result === 'number') return objeto.result;
  }
  return textoCelda(celda);
}

function normalizarEncabezadoClaveValor(texto: string): string {
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

@Injectable()
export class CifrasImportacionService {
  constructor(
    private readonly repositorio: CifrasRepositorio,
    private readonly registros: CifrasRegistrosRepositorio,
  ) {}

  // ---------------------------------------------------------------------------
  // Plantillas
  // ---------------------------------------------------------------------------

  async generarPlantilla(
    categoriaId: string,
  ): Promise<{ buffer: Buffer; nombreArchivo: string; mimeType: string }> {
    this.validarCategoria(categoriaId);
    const esquema = obtenerEsquemaCategoria(categoriaId);
    const libro = esquema
      ? await this.plantillaRegistros(esquema)
      : await this.plantillaClaveValor(categoriaId);

    const buffer = Buffer.from(await libro.xlsx.writeBuffer());
    return {
      buffer,
      nombreArchivo: `plantilla-cifras-${categoriaId}.xlsx`,
      mimeType: MIME_XLSX,
    };
  }

  private async plantillaRegistros(
    esquema: EsquemaCategoriaCifras,
  ): Promise<ExcelJS.Workbook> {
    const libro = new ExcelJS.Workbook();
    libro.creator = 'SIAC — CUAC';

    // Las columnas obsoletas (deprecadas) no se muestran en la plantilla pero se aceptan al importar.
    const columnasVisibles = esquema.columnas.filter((columna) => !columna.deprecada);

    const hoja = libro.addWorksheet(esquema.categoriaId);
    hoja.columns = columnasVisibles.map((columna) => ({
      header: columna.encabezado,
      key: columna.clave,
      width: Math.max(columna.encabezado.length + 4, 14),
    }));
    hoja.getRow(1).eachCell((celda, columna) => {
      const definicion = columnasVisibles[columna - 1];
      celda.font = { bold: true };
      celda.numFmt = FORMATOS_COLUMNA[definicion?.tipo ?? 'texto'] ?? '@';
    });
    hoja.getRow(2).eachCell((celda, columna) => {
      const definicion = columnasVisibles[columna - 1];
      if (definicion) celda.numFmt = FORMATOS_COLUMNA[definicion.tipo] ?? '@';
    });

    const instrucciones = libro.addWorksheet('instrucciones');
    instrucciones.columns = [
      { header: 'columna', key: 'columna', width: 32 },
      { header: 'tipo', key: 'tipo', width: 12 },
      { header: 'obligatoria', key: 'obligatoria', width: 12 },
      { header: 'valores permitidos', key: 'valores', width: 48 },
      { header: 'ejemplo', key: 'ejemplo', width: 24 },
    ];
    for (const columna of columnasVisibles) {
      instrucciones.addRow({
        columna: columna.encabezado,
        tipo: columna.tipo,
        obligatoria: columna.obligatoria ? 'sí' : 'no',
        valores: columna.enum?.join(' | ') ?? this.valoresPermitidos(columna),
        ejemplo: columna.ejemplo ?? '',
      });
    }

    return libro;
  }

  private valoresPermitidos(columna: ColumnaEsquemaCifras): string {
    switch (columna.tipo) {
      case 'periodo':
        return 'AAAA-S (ej. 2023-2)';
      case 'fecha':
        return 'AAAA-MM-DD o fecha de Excel';
      case 'codigo':
        return 'texto o número (se conserva el valor)';
      case 'entero':
        return columna.min !== undefined && columna.max !== undefined
          ? `entero entre ${columna.min} y ${columna.max}`
          : `entero >= ${columna.min ?? 0}`;
      case 'decimal':
        return `número >= ${columna.min ?? 0} con 2 decimales`;
      case 'texto':
        return columna.descripcion ?? 'texto libre';
      default:
        return '—';
    }
  }

  private async plantillaClaveValor(categoriaId: string): Promise<ExcelJS.Workbook> {
    const variables = await this.repositorio.listarVariablesActivas(categoriaId);
    if (variables.length === 0) {
      throw new NotFoundException(
        `La categoría «${tituloCategoriaCifras(categoriaId)}» no tiene variables activas. Ejecute la semilla de cifras.`,
      );
    }

    const libro = new ExcelJS.Workbook();
    libro.creator = 'SIAC — CUAC';

    const hojaDatos = libro.addWorksheet('datos');
    hojaDatos.columns = COLUMNAS_PLANTILLA_CLAVE_VALOR.map((columna) => ({
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

    return libro;
  }

  async generarPlantillaJson(categoriaId: string): Promise<PlantillaJsonCifrasDto> {
    this.validarCategoria(categoriaId);
    const esquema = obtenerEsquemaCategoria(categoriaId);
    if (esquema) {
      return {
        categoriaId,
        titulo: esquema.titulo,
        registros: [this.ejemploRegistro(esquema, 0), this.ejemploRegistro(esquema, 1)],
      };
    }

    const variables = await this.repositorio.listarVariablesActivas(categoriaId);
    const base = variables.slice(0, 2).map((variable, indice) => ({
      clave: variable.clave,
      valor: 10 + indice,
      periodo: '2023-2',
    }));
    return { categoriaId, titulo: tituloCategoriaCifras(categoriaId), registros: base };
  }

  private ejemploRegistro(
    esquema: EsquemaCategoriaCifras,
    indice: number,
  ): Record<string, unknown> {
    const registro: Record<string, unknown> = {};
    for (const columna of columnasPersistidas(esquema)) {
      const ejemplo = columna.ejemplo;
      if (ejemplo === undefined || ejemplo === '') {
        registro[columna.clave] = columna.tipo === 'entero' || columna.tipo === 'decimal' ? 0 : '';
        continue;
      }
      if (indice === 1 && (columna.tipo === 'entero' || columna.tipo === 'decimal')) {
        registro[columna.clave] = Number(ejemplo) + 1;
      } else {
        registro[columna.clave] = ejemplo;
      }
    }
    return registro;
  }

  // ---------------------------------------------------------------------------
  // Importación Excel
  // ---------------------------------------------------------------------------

  async importarExcel(
    categoriaId: string,
    archivo: Express.Multer.File,
    usuarioId?: string,
  ): Promise<RespuestaIngestaCifrasDto> {
    this.validarCategoria(categoriaId);

    if (archivo.size > MAX_BYTES_XLSX) {
      throw new BadRequestException(
        `El archivo supera el tamaño máximo de ${MAX_BYTES_XLSX / (1024 * 1024)} MB.`,
      );
    }

    const libro = new ExcelJS.Workbook();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await libro.xlsx.load(archivo.buffer as any);
    } catch {
      throw new BadRequestException('El archivo no es un Excel .xlsx válido.');
    }

    const esquema = obtenerEsquemaCategoria(categoriaId);
    if (esquema) {
      const hoja = this.seleccionarHoja(libro, esquema);
      const filas = this.leerFilasEsquema(esquema, hoja);
      return this.procesarRegistros(
        esquema,
        FuenteCifra.EXCEL,
        filas,
        archivo.originalname,
        usuarioId,
      );
    }

    return this.importarExcelClaveValor(categoriaId, libro, archivo.originalname, usuarioId);
  }

  private seleccionarHoja(
    libro: ExcelJS.Workbook,
    esquema: EsquemaCategoriaCifras,
  ): ExcelJS.Worksheet {
    const porNombre = libro.worksheets.find(
      (hoja) => hoja.name.trim().toLowerCase() === esquema.categoriaId,
    );
    if (porNombre) return porNombre;

    const hojaValida = libro.worksheets.find((hoja) => {
      const nombre = hoja.name.trim().toLowerCase();
      return nombre !== 'leeme' && nombre !== 'instrucciones';
    });
    if (hojaValida) return hojaValida;

    throw new BadRequestException(
      `El archivo no contiene la hoja «${esquema.categoriaId}» ni otra hoja de datos.`,
    );
  }

  private leerFilasEsquema(
    esquema: EsquemaCategoriaCifras,
    hoja: ExcelJS.Worksheet,
  ): FilaCrudaCifras[] {
    const indiceColumnas = mapaColumnasEsquema(esquema);
    const columnasPorNumero = new Map<number, ColumnaEsquemaCifras>();
    const desconocidas: string[] = [];

    hoja.getRow(1).eachCell({ includeEmpty: false }, (celda, numeroColumna) => {
      const encabezado = textoCelda(celda);
      if (!encabezado) return;
      const columna = indiceColumnas.get(normalizarClaveCifras(encabezado));
      if (!columna) {
        desconocidas.push(encabezado);
        return;
      }
      columnasPorNumero.set(numeroColumna, columna);
    });

    if (desconocidas.length > 0) {
      throw new BadRequestException(
        `La columna «${desconocidas[0]}» no existe en el esquema de ${esquema.titulo}. Revise la hoja «${esquema.categoriaId}».`,
      );
    }

    const faltantes = esquema.columnas.filter(
      (columna) =>
        columna.obligatoria &&
        !columna.deprecada &&
        !Array.from(columnasPorNumero.values()).some((mapeada) => mapeada.clave === columna.clave),
    );
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `Falta la columna obligatoria «${faltantes[0].encabezado}» en la hoja «${esquema.categoriaId}».`,
      );
    }

    const filas: FilaCrudaCifras[] = [];
    for (let numeroFila = 2; numeroFila <= hoja.rowCount; numeroFila++) {
      const fila = hoja.getRow(numeroFila);
      const celdas = new Map<string, unknown>();
      let tieneDatos = false;
      for (const [numeroColumna, columna] of columnasPorNumero) {
        const celda = fila.getCell(numeroColumna);
        const valor = celda.value;
        if (valor !== null && valor !== undefined && textoCelda(celda) !== '') {
          tieneDatos = true;
        }
        celdas.set(columna.clave, valor);
      }
      if (!tieneDatos) continue;
      filas.push({ numero: numeroFila, celdas });
    }

    if (filas.length === 0) {
      throw new BadRequestException(
        `La hoja «${esquema.categoriaId}» no contiene filas de datos.`,
      );
    }

    return filas;
  }

  // ---------------------------------------------------------------------------
  // Ingesta JSON
  // ---------------------------------------------------------------------------

  async ingestarPorApi(
    categoriaId: string,
    dto: IngestaCifrasDto,
    usuarioId?: string,
  ): Promise<RespuestaIngestaCifrasDto> {
    this.validarCategoria(categoriaId);

    const esquema = obtenerEsquemaCategoria(categoriaId);
    if (esquema) {
      const indiceColumnas = mapaColumnasEsquema(esquema);
      const filas: FilaCrudaCifras[] = dto.registros.map((registro, indice) => {
        const celdas = new Map<string, unknown>();
        for (const [campo, valor] of Object.entries(registro)) {
          const columna = indiceColumnas.get(normalizarClaveCifras(campo));
          if (!columna) {
            throw new BadRequestException(
              `El campo «${campo}» no existe en el esquema de ${esquema.titulo}.`,
            );
          }
          celdas.set(columna.clave, valor);
        }
        return { numero: indice + 1, celdas };
      });
      return this.procesarRegistros(esquema, FuenteCifra.API, filas, undefined, usuarioId);
    }

    return this.ingestarPorApiClaveValor(categoriaId, dto, usuarioId);
  }

  // ---------------------------------------------------------------------------
  // Pipeline de registros (estricto)
  // ---------------------------------------------------------------------------

  private async procesarRegistros(
    esquema: EsquemaCategoriaCifras,
    fuente: FuenteCifra,
    filas: FilaCrudaCifras[],
    nombreArchivo?: string,
    usuarioId?: string,
  ): Promise<RespuestaIngestaCifrasDto> {
    const errores: ErrorFilaIngestaDto[] = [];
    const validos: Array<Record<string, unknown>> = [];
    // Solo las categorías con clave única por fila (sede) rechazan duplicados en el archivo;
    // en las de periodo muchas filas comparten el mismo periodo por diseño.
    const exigeClaveUnica = esquema.claveReemplazo === 'sede';

    const clavesVistas = new Map<string, number>();
    for (const fila of filas) {
      const resultado = validarFilaCifras(esquema, fila);
      if (resultado.errores.length > 0) {
        for (const error of resultado.errores) {
          errores.push(this.aErrorFila(error));
        }
        continue;
      }
      const datos = resultado.datos!;
      const clave = String(datos[esquema.claveReemplazo]);
      if (exigeClaveUnica && clavesVistas.has(clave)) {
        const columna = esquema.columnas.find(
          (columnaEsquema) => columnaEsquema.clave === esquema.claveReemplazo,
        );
        errores.push({
          fila: fila.numero,
          columna: columna?.encabezado,
          mensaje: `Fila ${fila.numero}, columna ${columna?.encabezado ?? esquema.claveReemplazo}: «${clave}» ya aparece en otra fila del archivo.`,
        });
        continue;
      }
      clavesVistas.set(clave, fila.numero);
      validos.push(datos);
    }

    if (errores.length > 0) {
      await this.repositorio.ejecutarTransaccion((tx) =>
        this.repositorio.crearCarga(
          {
            categoriaId: esquema.categoriaId,
            fuente,
            nombreArchivo: nombreArchivo ?? null,
            filasOk: 0,
            filasError: errores.length,
            errores: errores as unknown as Prisma.InputJsonValue,
            usuarioId: usuarioId ?? null,
          },
          tx,
        ),
      );
      return {
        filasOk: 0,
        filasError: errores.length,
        errores,
        fuente: fuenteCifrasDto(fuente),
        periodosReemplazados: [],
      };
    }

    const clavesReemplazo = Array.from(clavesVistas.keys());
    await this.repositorio.ejecutarTransaccion(async (tx) => {
      const carga = await this.repositorio.crearCarga(
        {
          categoriaId: esquema.categoriaId,
          fuente,
          nombreArchivo: nombreArchivo ?? null,
          filasOk: validos.length,
          filasError: 0,
          usuarioId: usuarioId ?? null,
        },
        tx,
      );
      await this.registros.reemplazar(
        esquema.categoriaId,
        clavesReemplazo,
        validos,
        carga.id,
        tx,
      );
    });

    return {
      filasOk: validos.length,
      filasError: 0,
      errores: [],
      fuente: fuenteCifrasDto(fuente),
      periodosReemplazados: clavesReemplazo,
    };
  }

  private aErrorFila(error: ErrorValidacionCifras): ErrorFilaIngestaDto {
    return {
      fila: error.fila,
      columna: error.columna,
      mensaje: `Fila ${error.fila}, columna ${error.columna}: ${error.mensaje}`,
    };
  }

  // ---------------------------------------------------------------------------
  // Categorías clave/valor (bienestar y relaciones-entorno)
  // ---------------------------------------------------------------------------

  private async importarExcelClaveValor(
    categoriaId: string,
    libro: ExcelJS.Workbook,
    nombreArchivo: string,
    usuarioId?: string,
  ): Promise<RespuestaIngestaCifrasDto> {
    const hoja =
      libro.worksheets.find((worksheet) => worksheet.name.trim().toLowerCase() === 'datos') ??
      libro.worksheets[0];
    if (!hoja) {
      throw new BadRequestException('El archivo Excel no contiene hojas.');
    }

    const encabezados = new Map<ColumnaPlantillaClaveValor, number>();
    hoja.getRow(1).eachCell((celda, numeroColumna) => {
      const texto = normalizarEncabezadoClaveValor(textoCelda(celda));
      for (const columna of COLUMNAS_PLANTILLA_CLAVE_VALOR) {
        if (COINCIDENCIAS_ENCABEZADO[columna].includes(texto)) {
          encabezados.set(columna, numeroColumna);
        }
      }
    });

    for (const requerida of ['clave', 'periodo', 'valor'] as ColumnaPlantillaClaveValor[]) {
      if (!encabezados.has(requerida)) {
        throw new BadRequestException(
          `La hoja «datos» debe incluir las columnas: ${COLUMNAS_PLANTILLA_CLAVE_VALOR.join(', ')}.`,
        );
      }
    }

    const leer = (fila: ExcelJS.Row, columna: ColumnaPlantillaClaveValor): string => {
      const numeroColumna = encabezados.get(columna);
      return numeroColumna ? textoCelda(fila.getCell(numeroColumna)) : '';
    };

    const filas: FilaClaveValor[] = [];
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

    return this.procesarFilasClaveValor(
      categoriaId,
      FuenteCifra.EXCEL,
      filas,
      nombreArchivo,
      usuarioId,
    );
  }

  private async ingestarPorApiClaveValor(
    categoriaId: string,
    dto: IngestaCifrasDto,
    usuarioId?: string,
  ): Promise<RespuestaIngestaCifrasDto> {
    if (!dto.periodo) {
      throw new BadRequestException(
        `Para la categoría «${tituloCategoriaCifras(categoriaId)}» el periodo es obligatorio.`,
      );
    }
    const filas: FilaClaveValor[] = dto.registros.map((registro, indice) => ({
      fila: indice + 1,
      clave: String(registro.clave ?? '').trim(),
      valor: registro.valor as number | string | undefined,
      periodo: dto.periodo!,
      facultad: registro.facultad ? String(registro.facultad).trim() : undefined,
      programaCodigoSnies: registro.programaCodigoSnies
        ? String(registro.programaCodigoSnies).trim()
        : undefined,
      sede: registro.sede ? String(registro.sede).trim() : undefined,
      dimension: registro.dimension ? String(registro.dimension).trim() : undefined,
      valorDimension: registro.valorDimension
        ? String(registro.valorDimension).trim()
        : undefined,
    }));

    return this.procesarFilasClaveValor(categoriaId, FuenteCifra.API, filas, undefined, usuarioId);
  }

  private async procesarFilasClaveValor(
    categoriaId: string,
    fuente: FuenteCifra,
    filas: FilaClaveValor[],
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
      const resultado = await this.validarFilaClaveValor(
        fila,
        porClave,
        titulo,
        cacheProgramas,
      );

      if (resultado.error) {
        errores.push({
          fila: fila.fila,
          columna: resultado.columna,
          mensaje: `Fila ${fila.fila}: ${resultado.error}`,
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

  private async validarFilaClaveValor(
    fila: FilaClaveValor,
    porClave: Map<string, VariableCifra>,
    tituloCategoria: string,
    cacheProgramas: Map<string, Programa | null>,
  ): Promise<{
    error?: string;
    columna?: string;
    datos?: Omit<DatosCifraIndicador, 'fuente'>;
  }> {
    if (!fila.clave) {
      return { error: 'no indica la clave de la variable.', columna: 'clave' };
    }

    const variable = porClave.get(fila.clave);
    if (!variable) {
      return {
        error: `la clave '${fila.clave}' no existe en ${tituloCategoria}.`,
        columna: 'clave',
      };
    }
    if (!variable.activo) {
      return {
        error: `la clave '${fila.clave}' no está activa en ${tituloCategoria}.`,
        columna: 'clave',
      };
    }

    if (!fila.periodo) {
      return { error: 'el periodo es obligatorio (formato AAAA o AAAA-S, ej. 2026-1).', columna: 'periodo' };
    }
    if (!esPeriodoValido(fila.periodo)) {
      return { error: MENSAJE_PERIODO_INVALIDO, columna: 'periodo' };
    }

    const valor = this.parsearValor(fila.valor);
    if (valor === null) {
      return { error: `el valor '${fila.valor ?? ''}' no es numérico.`, columna: 'valor' };
    }

    let dimension: string | null = fila.dimension?.trim() || null;
    const valorDimension: string | null = fila.valorDimension?.trim() || null;

    if (variable.dimensiones.length === 0) {
      if (dimension || valorDimension) {
        return { error: `la variable '${variable.clave}' no admite dimensiones.`, columna: 'dimension' };
      }
    } else if (dimension) {
      const canonica = this.buscarDimensionPermitida(variable.dimensiones, dimension);
      if (!canonica) {
        return {
          error: `la dimensión '${dimension}' no está permitida para '${variable.clave}' (use: ${variable.dimensiones.join(', ')}).`,
          columna: 'dimension',
        };
      }
      dimension = canonica;
      if (!valorDimension) {
        return { error: `indique el valor de la dimensión '${dimension}'.`, columna: 'valor_dimension' };
      }
    } else if (valorDimension) {
      if (variable.dimensiones.length === 1) {
        dimension = variable.dimensiones[0];
      } else {
        return {
          error: `indique la dimensión para el valor '${valorDimension}' (use: ${variable.dimensiones.join(', ')}).`,
          columna: 'dimension',
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
        return { error: `el programa con código '${codigoSnies}' no existe.`, columna: 'codigo_snies' };
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

  private validarCategoria(categoriaId: string): void {
    if (esCategoriaCifrasValida(categoriaId)) return;
    throw new NotFoundException(
      `La categoría «${categoriaId}» no existe. Use: ${CATEGORIAS_CIFRAS.map((categoria) => categoria.id).join(', ')}.`,
    );
  }
}

export { esCategoriaDeRegistros };
