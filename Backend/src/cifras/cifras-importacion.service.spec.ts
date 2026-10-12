import { VariableCifra } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { CifrasImportacionService } from './cifras-importacion.service';
import { CifrasRepositorio, DatosCargaCifras, DatosCifraIndicador } from './cifras.repositorio';

type VariableFalsa = Pick<
  VariableCifra,
  'id' | 'categoriaId' | 'clave' | 'etiquetaCuac' | 'descripcion' | 'unidad' | 'dimensiones' | 'activo' | 'createdAt' | 'updatedAt'
>;

interface CargaFalsa extends DatosCargaCifras {
  id: string;
}

class RepositorioCifrasFalso {
  readonly variables: VariableFalsa[] = [
    {
      id: 'var-prof-vinculacion',
      categoriaId: 'profesores',
      clave: 'por_vinculacion',
      etiquetaCuac: 'Profesores por vinculación',
      descripcion: null,
      unidad: 'conteo',
      dimensiones: ['vinculacion'],
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'var-prof-dedicacion',
      categoriaId: 'profesores',
      clave: 'por_dedicacion',
      etiquetaCuac: 'Profesores por dedicación',
      descripcion: null,
      unidad: 'conteo',
      dimensiones: ['dedicacion'],
      activo: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'var-aseg-vencimientos',
      categoriaId: 'aseguramiento',
      clave: 'vencimientos_por_anio',
      etiquetaCuac: 'Vencimientos por año',
      descripcion: null,
      unidad: 'conteo',
      dimensiones: ['anio', 'tipo'],
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'var-est-total',
      categoriaId: 'estudiantes',
      clave: 'total_matriculados',
      etiquetaCuac: 'Total matriculados',
      descripcion: null,
      unidad: 'conteo',
      dimensiones: [],
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  readonly programas = new Map([['1101', { id: 'programa-1' }]]);

  readonly store = new Map<string, DatosCifraIndicador & { id: string }>();

  readonly cargas: CargaFalsa[] = [];

  async listarVariables(categoriaId?: string): Promise<VariableFalsa[]> {
    return this.variables.filter(
      (variable) => !categoriaId || variable.categoriaId === categoriaId,
    );
  }

  async listarVariablesActivas(categoriaId: string): Promise<VariableFalsa[]> {
    return (await this.listarVariables(categoriaId)).filter((variable) => variable.activo);
  }

  async buscarProgramaPorCodigo(codigo: string) {
    return this.programas.get(codigo) ?? null;
  }

  async reemplazarValor(
    datos: DatosCifraIndicador,
  ): Promise<DatosCifraIndicador & { id: string }> {
    const identidad = [
      datos.variableId,
      datos.periodo,
      datos.facultad ?? '',
      datos.programaId ?? '',
      datos.sede ?? '',
      datos.dimension ?? '',
      datos.valorDimension ?? '',
    ].join('|');
    const existente = this.store.get(identidad);
    const fila = { id: existente?.id ?? `cifra-${this.store.size + 1}`, ...datos };
    this.store.set(identidad, fila);
    return fila;
  }

  async crearCarga(datos: DatosCargaCifras): Promise<CargaFalsa> {
    const carga = { id: `carga-${this.cargas.length + 1}`, ...datos };
    this.cargas.push(carga);
    return carga;
  }

  async ejecutarTransaccion<T>(fn: (tx: never) => Promise<T>): Promise<T> {
    return fn(undefined as never);
  }
}

async function crearLibro(
  filas: Array<Array<string | number | null>>,
): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('datos');
  hoja.addRow([
    'clave',
    'periodo',
    'facultad',
    'codigo_snies',
    'sede',
    'dimension',
    'valor_dimension',
    'valor',
  ]);
  for (const fila of filas) {
    hoja.addRow(fila);
  }
  return Buffer.from(await libro.xlsx.writeBuffer());
}

function archivoXlsx(buffer: Buffer, nombre = 'cifras.xlsx'): Express.Multer.File {
  return {
    buffer,
    originalname: nombre,
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: buffer.length,
  } as Express.Multer.File;
}

describe('CifrasImportacionService', () => {
  let repositorio: RepositorioCifrasFalso;
  let servicio: CifrasImportacionService;

  beforeEach(() => {
    repositorio = new RepositorioCifrasFalso();
    servicio = new CifrasImportacionService(
      repositorio as unknown as CifrasRepositorio,
    );
  });

  describe('plantilla', () => {
    it('genera hojas «datos» y «variables» con las columnas esperadas', async () => {
      const { buffer, nombreArchivo, mimeType } = await servicio.generarPlantilla('profesores');

      expect(nombreArchivo).toBe('plantilla-cifras-profesores.xlsx');
      expect(mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );

      const libro = new ExcelJS.Workbook();
      await libro.xlsx.load(buffer as unknown as ArrayBuffer);

      const hojaDatos = libro.getWorksheet('datos');
      const hojaVariables = libro.getWorksheet('variables');
      expect(hojaDatos).toBeDefined();
      expect(hojaVariables).toBeDefined();
      expect(hojaDatos!.getRow(1).values).toEqual(
        expect.arrayContaining(['clave', 'periodo', 'valor']),
      );
      expect(hojaVariables!.rowCount).toBe(2);
      expect(hojaVariables!.getRow(2).getCell(1).value).toBe('por_vinculacion');
    });
  });

  describe('importación Excel', () => {
    it('importa una fila válida con fuente EXCEL', async () => {
      const buffer = await crearLibro([
        ['por_vinculacion', '2025-2', '', '', '', 'vinculacion', 'Tiempo completo', 120],
      ]);

      const resultado = await servicio.importarExcel('profesores', archivoXlsx(buffer), 'usuario-1');

      expect(resultado).toEqual({
        filasOk: 1,
        filasError: 0,
        errores: [],
        fuente: 'EXCEL',
      });
      expect(repositorio.store.size).toBe(1);
      const guardada = [...repositorio.store.values()][0];
      expect(guardada.valor).toBe(120);
      expect(guardada.dimension).toBe('vinculacion');
      expect(guardada.valorDimension).toBe('Tiempo completo');
      expect(repositorio.cargas).toHaveLength(1);
      expect(repositorio.cargas[0]).toMatchObject({
        fuente: 'EXCEL',
        filasOk: 1,
        filasError: 0,
        usuarioId: 'usuario-1',
        nombreArchivo: 'cifras.xlsx',
      });
    });

    it('reporta fila con clave inexistente', async () => {
      const buffer = await crearLibro([['xyz', '2025-2', '', '', '', '', '', 10]]);

      const resultado = await servicio.importarExcel('profesores', archivoXlsx(buffer));

      expect(resultado.filasOk).toBe(0);
      expect(resultado.filasError).toBe(1);
      expect(resultado.errores[0].fila).toBe(2);
      expect(resultado.errores[0].motivo).toContain(
        "la clave 'xyz' no existe en Profesores",
      );
      expect(resultado.errores[0].motivo.startsWith('Fila 2:')).toBe(true);
    });

    it('reporta periodo inválido con el mensaje estándar', async () => {
      const buffer = await crearLibro([
        ['por_vinculacion', '2025-3', '', '', '', 'vinculacion', 'Tiempo completo', 10],
      ]);

      const resultado = await servicio.importarExcel('profesores', archivoXlsx(buffer));

      expect(resultado.filasError).toBe(1);
      expect(resultado.errores[0].motivo).toBe(
        'Fila 2: El periodo debe tener formato AAAA-S (ej. 2026-1) o AAAA.',
      );
      expect(repositorio.store.size).toBe(0);
    });

    it('reporta valor no numérico', async () => {
      const buffer = await crearLibro([
        ['por_vinculacion', '2025-2', '', '', '', 'vinculacion', 'Tiempo completo', 'abc'],
      ]);

      const resultado = await servicio.importarExcel('profesores', archivoXlsx(buffer));

      expect(resultado.filasError).toBe(1);
      expect(resultado.errores[0].motivo).toContain("el valor 'abc' no es numérico");
    });

    it('reporta dimensiones no admitidas por la variable', async () => {
      const buffer = await crearLibro([
        ['total_matriculados', '2025-2', '', '', '', 'genero', 'Femenino', 10],
      ]);

      const resultado = await servicio.importarExcel('estudiantes', archivoXlsx(buffer));

      expect(resultado.filasError).toBe(1);
      expect(resultado.errores[0].motivo).toContain(
        "la variable 'total_matriculados' no admite dimensiones",
      );
    });

    it('rechaza una dimensión que no está en VariableCifra.dimensiones', async () => {
      const buffer = await crearLibro([
        ['por_vinculacion', '2025-2', '', '', '', 'sede', 'Popayán', 10],
      ]);

      const resultado = await servicio.importarExcel('profesores', archivoXlsx(buffer));

      expect(resultado.filasOk).toBe(0);
      expect(resultado.filasError).toBe(1);
      expect(resultado.errores[0].motivo).toContain(
        "la dimensión 'sede' no está permitida para 'por_vinculacion' (use: vinculacion).",
      );
      expect(repositorio.store.size).toBe(0);
    });

    it('acepta la dimensión sin distinguir mayúsculas/acentos y guarda el nombre canónico', async () => {
      const buffer = await crearLibro([
        ['por_vinculacion', '2025-2', '', '', '', 'VINCULACIÓN', 'Tiempo completo', 30],
      ]);

      const resultado = await servicio.importarExcel('profesores', archivoXlsx(buffer));

      expect(resultado.filasOk).toBe(1);
      const guardada = [...repositorio.store.values()][0];
      expect(guardada.dimension).toBe('vinculacion');
      expect(guardada.valorDimension).toBe('Tiempo completo');
    });

    it('exige indicar la dimensión cuando la variable admite varias', async () => {
      const buffer = await crearLibro([
        ['vencimientos_por_anio', '2025-2', '', '', '', '', '2026', 4],
      ]);

      const resultado = await servicio.importarExcel('aseguramiento', archivoXlsx(buffer));

      expect(resultado.filasError).toBe(1);
      expect(resultado.errores[0].motivo).toContain(
        "indique la dimensión para el valor '2026' (use: anio, tipo).",
      );
    });

    it('acepta una dimensión válida cuando la variable admite varias', async () => {
      const buffer = await crearLibro([
        ['vencimientos_por_anio', '2025-2', '', '', '', 'TIPO', 'Registro calificado', 4],
      ]);

      const resultado = await servicio.importarExcel('aseguramiento', archivoXlsx(buffer));

      expect(resultado.filasOk).toBe(1);
      const guardada = [...repositorio.store.values()][0];
      expect(guardada.dimension).toBe('tipo');
      expect(guardada.valorDimension).toBe('Registro calificado');
    });

    it('exige el valor de la dimensión cuando se envía la dimensión sola', async () => {
      const buffer = await crearLibro([
        ['por_vinculacion', '2025-2', '', '', '', 'vinculacion', '', 5],
      ]);

      const resultado = await servicio.importarExcel('profesores', archivoXlsx(buffer));

      expect(resultado.filasError).toBe(1);
      expect(resultado.errores[0].motivo).toContain(
        "indique el valor de la dimensión 'vinculacion'.",
      );
    });

    it('el upsert reemplaza el valor de la misma identidad', async () => {
      const primera = await crearLibro([
        ['por_vinculacion', '2025-2', '', '', '', 'vinculacion', 'Tiempo completo', 100],
      ]);
      const segunda = await crearLibro([
        ['por_vinculacion', '2025-2', '', '', '', 'vinculacion', 'Tiempo completo', 150],
      ]);

      await servicio.importarExcel('profesores', archivoXlsx(primera));
      const resultado = await servicio.importarExcel('profesores', archivoXlsx(segunda));

      expect(resultado.filasOk).toBe(1);
      expect(repositorio.store.size).toBe(1);
      expect([...repositorio.store.values()][0].valor).toBe(150);
      expect(repositorio.cargas).toHaveLength(2);
    });

    it('errores por fila e importación parcial en el mismo archivo', async () => {
      const buffer = await crearLibro([
        ['por_vinculacion', '2025-2', '', '', '', 'vinculacion', 'Tiempo completo', 120],
        ['xyz', '2025-2', '', '', '', '', '', 10],
      ]);

      const resultado = await servicio.importarExcel('profesores', archivoXlsx(buffer));

      expect(resultado.filasOk).toBe(1);
      expect(resultado.filasError).toBe(1);
      expect(repositorio.store.size).toBe(1);
    });
  });

  describe('ingesta por API', () => {
    it('ingesta registros válidos con fuente API y upsert lógico', async () => {
      const resultado = await servicio.ingestarPorApi('profesores', {
        periodo: '2025-2',
        registros: [
          {
            clave: 'por_vinculacion',
            valor: 98,
            dimension: 'vinculacion',
            valorDimension: 'Planta',
          },
        ],
      });

      expect(resultado).toMatchObject({ filasOk: 1, filasError: 0, fuente: 'API' });

      const segundo = await servicio.ingestarPorApi('profesores', {
        periodo: '2025-2',
        registros: [
          {
            clave: 'por_vinculacion',
            valor: 101,
            dimension: 'vinculacion',
            valorDimension: 'Planta',
          },
        ],
      });

      expect(segundo.filasOk).toBe(1);
      expect(repositorio.store.size).toBe(1);
      expect([...repositorio.store.values()][0].valor).toBe(101);
    });

    it('reporta clave inexistente sin abortar la petición', async () => {
      const resultado = await servicio.ingestarPorApi('profesores', {
        periodo: '2025-2',
        registros: [{ clave: 'no_existe', valor: 1 }],
      });

      expect(resultado.filasOk).toBe(0);
      expect(resultado.filasError).toBe(1);
      expect(resultado.errores[0].motivo).toContain(
        "la clave 'no_existe' no existe en Profesores",
      );
    });

    it('reporta una dimensión no permitida en ingesta API', async () => {
      const resultado = await servicio.ingestarPorApi('profesores', {
        periodo: '2025-2',
        registros: [
          {
            clave: 'por_vinculacion',
            valor: 10,
            dimension: 'campus',
            valorDimension: 'Norte',
          },
        ],
      });

      expect(resultado.filasOk).toBe(0);
      expect(resultado.filasError).toBe(1);
      expect(resultado.errores[0].motivo).toContain(
        "la dimensión 'campus' no está permitida para 'por_vinculacion' (use: vinculacion).",
      );
    });

    it('resuelve el programa por código SNIES', async () => {
      const buffer = await crearLibro([
        [
          'por_vinculacion',
          '2025-2',
          '',
          '1101',
          '',
          'vinculacion',
          'Tiempo completo',
          30,
        ],
      ]);

      const resultado = await servicio.importarExcel('profesores', archivoXlsx(buffer));

      expect(resultado.filasOk).toBe(1);
      expect([...repositorio.store.values()][0].programaId).toBe('programa-1');
    });
  });
});
