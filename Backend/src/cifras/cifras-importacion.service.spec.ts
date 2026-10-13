import { BadRequestException, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as ExcelJS from 'exceljs';
import { CifrasImportacionService } from './cifras-importacion.service';
import { CifrasRegistrosRepositorio } from './cifras-registros.repositorio';
import { CifrasRepositorio } from './cifras.repositorio';

interface LlamadaReemplazo {
  categoriaId: string;
  claves: string[];
  filas: Array<Record<string, unknown>>;
}

class RepositorioClaveValorFalso {
  variables: Array<Record<string, unknown>> = [];

  async listarVariables() {
    return this.variables;
  }

  async listarVariablesActivas() {
    return this.variables.filter((variable) => variable.activo !== false);
  }

  async crearCarga(datos: Record<string, unknown>) {
    return { id: `carga-cv-${Math.random().toString(36).slice(2)}`, ...datos };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ejecutarTransaccion<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return fn(undefined);
  }

  async reemplazarValor() {
    return {};
  }

  async buscarProgramaPorCodigo() {
    return null;
  }
}

class RegistrosFalso {
  llamadas: LlamadaReemplazo[] = [];
  readonly tienda = new Map<string, Array<Record<string, unknown>>>();

  async reemplazar(
    categoriaId: string,
    claves: string[],
    filas: Array<Record<string, unknown>>,
  ): Promise<number> {
    this.llamadas.push({ categoriaId, claves, filas });
    const previos = this.tienda.get(categoriaId) ?? [];
    const campo =
      categoriaId === 'infraestructura'
        ? 'sede'
        : categoriaId === 'egresados'
          ? 'graduados_periodo'
          : 'periodo_academico';
    const restantes = previos.filter((fila) => !claves.includes(String(fila[campo])));
    this.tienda.set(categoriaId, [...restantes, ...filas]);
    return filas.length;
  }

  async contar(categoriaId: string): Promise<number> {
    return (this.tienda.get(categoriaId) ?? []).length;
  }

  async consultar(categoriaId: string): Promise<Array<Record<string, unknown>>> {
    return this.tienda.get(categoriaId) ?? [];
  }
}

function archivoXlsx(buffer: Buffer, nombre = 'cifras.xlsx'): Express.Multer.File {
  return {
    buffer,
    originalname: nombre,
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: buffer.length,
  } as Express.Multer.File;
}

const ENCABEZADOS_ESTUDIANTES = [
  'nombre estudiante',
  'programa',
  'genero',
  'falcultad',
  'semestre',
  'estrato',
  'valor_dimension',
  'codigo estudiante',
  'periodo academico',
];

function filaEstudiante(
  overrides: Partial<Record<string, unknown>> = {},
): Array<unknown> {
  const base: Record<string, unknown> = {
    nombre: 'Ana Pérez',
    programa: 'Ingeniería Agropecuaria',
    genero: 'Femenino',
    facultad: 'Facultad de Ciencias Agrarias',
    semestre: 5,
    estrato: 2,
    valorDimension: 1,
    codigo: '0012345',
    periodo: '2023-2',
    ...overrides,
  };
  return [
    base.nombre,
    base.programa,
    base.genero,
    base.facultad,
    base.semestre,
    base.estrato,
    base.valorDimension,
    base.codigo,
    base.periodo,
  ];
}

async function libroEstudiantes(filas: Array<Array<unknown>>): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('estudiantes');
  hoja.addRow(ENCABEZADOS_ESTUDIANTES);
  for (const fila of filas) hoja.addRow(fila);
  return Buffer.from(await libro.xlsx.writeBuffer());
}

async function libroAseguramiento(filas: Array<Array<unknown>>): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('aseguramiento');
  hoja.addRow([
    'periodo academico',
    'programas',
    'facultad',
    'grado',
    'nivel',
    'acreditados',
    'acreditables',
    'registros calificables',
    'inicio siac',
    'finalizacion siac',
    'snies',
  ]);
  for (const fila of filas) hoja.addRow(fila);
  return Buffer.from(await libro.xlsx.writeBuffer());
}

/** Hoja de infraestructura con encabezados nuevos, sustituyendo el de área construida. */
async function libroInfraestructura(
  encabezadoArea: string,
  sede: string,
  area: number,
): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('infraestructura');
  const encabezados = ENCABEZADOS_NUEVOS.infraestructura.map((encabezado) =>
    encabezado === 'Área construida total (m²)' ? encabezadoArea : encabezado,
  );
  hoja.addRow(encabezados);
  hoja.addRow([sede, 'Dirección', 2, 'En uso', area, 200, 1, 10, 1, 10, 1, 10, 1, 10, 1, 10, 1, 10, 1, 1, 1]);
  return Buffer.from(await libro.xlsx.writeBuffer());
}

const ENCABEZADOS_NUEVOS: Record<string, string[]> = {
  estudiantes: [
    'Nombre del estudiante',
    'Programa',
    'Género',
    'Facultad',
    'Semestre',
    'Estrato',
    'Código del estudiante',
    'Período académico',
  ],
  profesores: [
    'Nombre del profesor',
    'Programa',
    'Género',
    'Facultad',
    'Período de inicio',
    'Período final',
    'Período académico',
    'Estrato',
  ],
  egresados: [
    'Nombre del egresado',
    'Programa',
    'Género',
    'Facultad',
    'Período de graduación',
    'Estrato',
    'Grado',
    'Nivel',
  ],
  investigacion: [
    'Facultad',
    'Grupo de investigación',
    'Semillero',
    'Período académico',
    'Cantidad de estudiantes',
    'Género',
    'Programa',
  ],
  aseguramiento: [
    'Período académico',
    'Programa',
    'Facultad',
    'Grado',
    'Nivel',
    'Acreditado',
    'Acreditable',
    'Registro calificado',
    'Inicio SIAC',
    'Finalización SIAC',
    'Código SNIES',
  ],
  infraestructura: [
    'Sede',
    'Dirección',
    'Número de pisos',
    'Estado',
    'Área construida total (m²)',
    'Área de terreno total (m²)',
    'Cantidad de salones de clase',
    'Área de salones de clase (m²)',
    'Cantidad de salas de sistemas',
    'Área de salas de sistemas (m²)',
    'Cantidad de laboratorios',
    'Área de laboratorios (m²)',
    'Cantidad de auditorios',
    'Área de auditorios (m²)',
    'Cantidad de salas de lectura',
    'Área de salas de lectura (m²)',
    'Cantidad de zonas deportivas',
    'Área de zonas deportivas (m²)',
    'Cantidad de cafeterías',
    'Cantidad de zonas de estudio',
    'Cantidad de zonas recreativas',
  ],
};

function encabezadosDeHoja(hoja: ExcelJS.Worksheet): string[] {
  const encabezados: string[] = [];
  hoja.getRow(1).eachCell({ includeEmpty: false }, (celda) => {
    encabezados.push(String(celda.value ?? '').trim());
  });
  return encabezados;
}

describe('CifrasImportacionService (S3-03)', () => {
  let repositorio: RepositorioClaveValorFalso;
  let registros: RegistrosFalso;
  let servicio: CifrasImportacionService;

  beforeEach(() => {
    repositorio = new RepositorioClaveValorFalso();
    registros = new RegistrosFalso();
    servicio = new CifrasImportacionService(
      repositorio as unknown as CifrasRepositorio,
      registros as unknown as CifrasRegistrosRepositorio,
    );
  });

  describe('fixture real reducido (docs/plantillas-siac.xlsx)', () => {
    const rutaFixture = join(
      process.cwd(),
      'test',
      'fixtures',
      'plantillas-siac-reducido.xlsx',
    );

    it('importa sin errores las 6 hojas reales', async () => {
      const buffer = readFileSync(rutaFixture);
      const esperados: Record<string, number> = {
        estudiantes: 20,
        profesores: 20,
        egresados: 20,
        investigacion: 20,
        aseguramiento: 20,
        infraestructura: 12,
      };

      for (const [categoria, filas] of Object.entries(esperados)) {
        const resultado = await servicio.importarExcel(
          categoria,
          archivoXlsx(buffer, 'plantillas-siac-reducido.xlsx'),
        );
        expect({ categoria, ...resultado }).toMatchObject({
          categoria,
          filasOk: filas,
          filasError: 0,
        });
      }
    });
  });

  describe('validación por tipo', () => {
    it('acepta el alias «falcultad» y convierte códigos numéricos sin notación científica', async () => {
      const libro = new ExcelJS.Workbook();
      const hoja = libro.addWorksheet('estudiantes');
      hoja.addRow(ENCABEZADOS_ESTUDIANTES);
      const fila = filaEstudiante({ codigo: 1234567890123 });
      hoja.addRow(fila);
      const buffer = Buffer.from(await libro.xlsx.writeBuffer());

      const resultado = await servicio.importarExcel('estudiantes', archivoXlsx(buffer));

      expect(resultado.filasOk).toBe(1);
      expect(resultado.filasError).toBe(0);
      const guardada = registros.tienda.get('estudiantes')?.[0];
      expect(guardada?.codigo_estudiante).toBe('1234567890123');
      expect(guardada?.facultad).toBe('Facultad de Ciencias Agrarias');
    });

    it('reporta estrato no entero con el mensaje esperado y no inserta nada', async () => {
      const buffer = await libroEstudiantes([filaEstudiante({ estrato: 'siete' })]);

      const resultado = await servicio.importarExcel('estudiantes', archivoXlsx(buffer));

      expect(resultado.filasOk).toBe(0);
      expect(resultado.filasError).toBe(1);
      expect(resultado.errores[0].mensaje).toBe(
        'Fila 2, columna Estrato: debe ser un entero entre 1 y 6',
      );
      expect(registros.llamadas).toHaveLength(0);
      expect(registros.tienda.size).toBe(0);
    });

    it('reporta estrato fuera de rango', async () => {
      const buffer = await libroEstudiantes([filaEstudiante({ estrato: 7 })]);
      const resultado = await servicio.importarExcel('estudiantes', archivoXlsx(buffer));
      expect(resultado.errores[0].mensaje).toBe(
        'Fila 2, columna Estrato: debe ser un entero entre 1 y 6',
      );
    });

    it('reporta un enum inválido', async () => {
      const buffer = await libroEstudiantes([filaEstudiante({ genero: 'Otro' })]);
      const resultado = await servicio.importarExcel('estudiantes', archivoXlsx(buffer));
      expect(resultado.errores[0].mensaje).toContain(
        'Fila 2, columna Género: debe ser uno de: Femenino, Masculino, No binario, No informa',
      );
    });

    it('reporta un periodo inválido', async () => {
      const buffer = await libroEstudiantes([filaEstudiante({ periodo: '2023-3' })]);
      const resultado = await servicio.importarExcel('estudiantes', archivoXlsx(buffer));
      expect(resultado.errores[0].mensaje).toContain(
        'Fila 2, columna Período académico: debe tener formato AAAA-S',
      );
    });

    it('reporta banderas de aseguramiento que no suman 1', async () => {
      const buffer = await libroAseguramiento([
        [
          '2023-2',
          'Artes Plásticas',
          'Facultad de Artes',
          'Profesional',
          'Pregrado',
          1,
          1,
          0,
          new Date('2023-08-01T00:00:00.000Z'),
          new Date('2023-12-15T00:00:00.000Z'),
          '224',
        ],
      ]);

      const resultado = await servicio.importarExcel('aseguramiento', archivoXlsx(buffer));

      expect(resultado.filasError).toBe(1);
      expect(resultado.errores[0].mensaje).toContain('debe sumar 1 en la fila');
    });

    it('reporta finalización anterior al inicio', async () => {
      const buffer = await libroAseguramiento([
        [
          '2023-2',
          'Artes Plásticas',
          'Facultad de Artes',
          'Profesional',
          'Pregrado',
          0,
          1,
          0,
          new Date('2023-12-15T00:00:00.000Z'),
          new Date('2023-08-01T00:00:00.000Z'),
          '224',
        ],
      ]);

      const resultado = await servicio.importarExcel('aseguramiento', archivoXlsx(buffer));

      expect(resultado.filasError).toBe(1);
      expect(resultado.errores[0].mensaje).toContain(
        'Fila 2, columna Finalización SIAC: debe ser mayor o igual que «Inicio SIAC»',
      );
    });

    it('rechaza encabezados desconocidos y columnas obligatorias faltantes', async () => {
      const libro = new ExcelJS.Workbook();
      const hoja = libro.addWorksheet('estudiantes');
      hoja.addRow([...ENCABEZADOS_ESTUDIANTES, 'columna rara']);
      hoja.addRow([...filaEstudiante(), 'x']);
      const conExtra = Buffer.from(await libro.xlsx.writeBuffer());
      await expect(
        servicio.importarExcel('estudiantes', archivoXlsx(conExtra)),
      ).rejects.toBeInstanceOf(BadRequestException);

      const libro2 = new ExcelJS.Workbook();
      const hoja2 = libro2.addWorksheet('estudiantes');
      hoja2.addRow(ENCABEZADOS_ESTUDIANTES.filter((encabezado) => encabezado !== 'falcultad'));
      hoja2.addRow(filaEstudiante());
      const sinFacultad = Buffer.from(await libro2.xlsx.writeBuffer());
      await expect(
        servicio.importarExcel('estudiantes', archivoXlsx(sinFacultad)),
      ).rejects.toThrow(/Falta la columna obligatoria «Facultad»/);
    });

    it('rechaza sedes duplicadas en infraestructura', async () => {
      const libro = new ExcelJS.Workbook();
      const hoja = libro.addWorksheet('infraestructura');
      hoja.addRow([
        'sede',
        'direccion',
        'numero de pisos',
        'estado',
        'total m2 area construida',
        'total m2 area terreno',
        'cantidad salones de clase',
        'area m2 salon de clase',
        'cantidad salas de sistemas',
        'area m2 salas de sistemas',
        'cantidad laboratorios',
        'area m2 laboratorios',
        'cantidad auditorios',
        'area m2 auditorios',
        'cantidad salas de lectura',
        'area m2 salas de lectura',
        'cantidad zonas deportivas',
        'area m2 zonas deportivas',
        'cantidad cafeterias',
        'cantidad zonas de estudio',
        'cantidad zonas recreativas',
      ]);
      const filaBase = (sede: string) => [
        sede,
        'Dirección',
        2,
        'En uso',
        100,
        200,
        1,
        10,
        1,
        10,
        1,
        10,
        1,
        10,
        1,
        10,
        1,
        10,
        1,
        1,
        1,
      ];
      hoja.addRow(filaBase('Sede A'));
      hoja.addRow(filaBase('Sede A'));
      const buffer = Buffer.from(await libro.xlsx.writeBuffer());

      const resultado = await servicio.importarExcel('infraestructura', archivoXlsx(buffer));

      expect(resultado.filasError).toBe(1);
      expect(resultado.errores[0].mensaje).toContain('ya aparece en otra fila del archivo');
    });
  });

  describe('reemplazo por periodo', () => {
    it('reimportar el mismo periodo no duplica registros', async () => {
      const primera = await libroEstudiantes([
        filaEstudiante({ codigo: '001' }),
        filaEstudiante({ codigo: '002' }),
      ]);
      const segunda = await libroEstudiantes([filaEstudiante({ codigo: '003' })]);

      const uno = await servicio.importarExcel('estudiantes', archivoXlsx(primera));
      const dos = await servicio.importarExcel('estudiantes', archivoXlsx(segunda));

      expect(uno.filasOk).toBe(2);
      expect(dos.filasOk).toBe(1);
      expect(dos.periodosReemplazados).toEqual(['2023-2']);
      expect(registros.tienda.get('estudiantes')).toHaveLength(1);
      expect(registros.llamadas).toHaveLength(2);
      expect(registros.llamadas[1].claves).toEqual(['2023-2']);
    });

    it('conserva otros periodos al reimportar', async () => {
      const periodo2023 = await libroEstudiantes([filaEstudiante({ periodo: '2023-2' })]);
      const periodo2024 = await libroEstudiantes([filaEstudiante({ periodo: '2024-1' })]);

      await servicio.importarExcel('estudiantes', archivoXlsx(periodo2023));
      const resultado = await servicio.importarExcel('estudiantes', archivoXlsx(periodo2024));

      expect(resultado.periodosReemplazados).toEqual(['2024-1']);
      const periodos = (registros.tienda.get('estudiantes') ?? []).map((fila) =>
        String(fila.periodo_academico),
      );
      expect(periodos.sort()).toEqual(['2023-2', '2024-1']);
    });
  });

  describe('ingesta JSON', () => {
    it('acepta claves camelCase y snake_case', async () => {
      const resultado = await servicio.ingestarPorApi('estudiantes', {
        registros: [
          {
            programa: 'Ingeniería Agropecuaria',
            genero: 'Femenino',
            facultad: 'Facultad de Ciencias Agrarias',
            semestre: 5,
            estrato: 2,
            codigoEstudiante: '001',
            periodoAcademico: '2023-2',
          },
          {
            programa: 'Derecho',
            genero: 'Masculino',
            facultad: 'Facultad de Derecho',
            semestre: 3,
            estrato: 1,
            codigo_estudiante: '002',
            periodo_academico: '2023-2',
          },
        ],
      });

      expect(resultado.filasOk).toBe(2);
      expect(resultado.errores).toHaveLength(0);
      expect(resultado.fuente).toBe('API');
    });

    it('rechaza campos fuera del esquema', async () => {
      await expect(
        servicio.ingestarPorApi('estudiantes', {
          registros: [{ programa: 'X', campo_inventado: 1 }],
        }),
      ).rejects.toThrow(/no existe en el esquema/);
    });

    it('rechaza categorías inexistentes', async () => {
      await expect(
        servicio.ingestarPorApi('no-existe', { registros: [{}] }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('categorías clave/valor (bienestar)', () => {
    it('mantiene el formato anterior con mensajes en español', async () => {
      repositorio.variables = [
        {
          id: 'var-1',
          categoriaId: 'bienestar',
          clave: 'tasa_permanencia',
          etiquetaCuac: 'Tasa de permanencia',
          unidad: 'porcentaje',
          dimensiones: [],
          activo: true,
        },
      ];

      const resultado = await servicio.ingestarPorApi('bienestar', {
        periodo: '2023-2',
        registros: [
          { clave: 'tasa_permanencia', valor: 91.4 },
          { clave: 'inexistente', valor: 1 },
        ],
      });

      expect(resultado.filasOk).toBe(1);
      expect(resultado.filasError).toBe(1);
      expect(resultado.errores[0].mensaje).toContain("la clave 'inexistente' no existe");
    });
  });

  describe('plantillas', () => {
    it('cada plantilla trae exactamente los encabezados nuevos (sin columnas obsoletas)', async () => {
      for (const [categoria, esperados] of Object.entries(ENCABEZADOS_NUEVOS)) {
        const { buffer } = await servicio.generarPlantilla(categoria);
        const libro = new ExcelJS.Workbook();
        await libro.xlsx.load(buffer as unknown as ArrayBuffer);
        const hojaDatos = libro.getWorksheet(categoria);
        expect(hojaDatos).toBeDefined();
        expect({ categoria, encabezados: encabezadosDeHoja(hojaDatos!) }).toEqual({
          categoria,
          encabezados: esperados,
        });
      }
      expect(ENCABEZADOS_NUEVOS.estudiantes).not.toContain('Valor de la dimensión');
      expect(ENCABEZADOS_NUEVOS.estudiantes).not.toContain('valor_dimension');
    });

    it('«Área construida total (m²)» y «total m2 area construida» mapean a la misma clave', async () => {
      const nuevo = await libroInfraestructura('Área construida total (m²)', 'Sede Nueva', 7200);
      const viejo = await libroInfraestructura('total m2 area construida', 'Sede Vieja', 4300);

      const resultadoNuevo = await servicio.importarExcel(
        'infraestructura',
        archivoXlsx(nuevo),
      );
      const resultadoViejo = await servicio.importarExcel(
        'infraestructura',
        archivoXlsx(viejo),
      );

      expect(resultadoNuevo.filasError).toBe(0);
      expect(resultadoViejo.filasError).toBe(0);
      const filas = registros.tienda.get('infraestructura') ?? [];
      expect(filas.find((fila) => fila.sede === 'Sede Nueva')?.total_m2_area_construida).toBe(7200);
      expect(filas.find((fila) => fila.sede === 'Sede Vieja')?.total_m2_area_construida).toBe(4300);
    });

    it('la plantilla de estudiantes trae solo su hoja de datos e instrucciones', async () => {
      const { buffer } = await servicio.generarPlantilla('estudiantes');
      const libro = new ExcelJS.Workbook();
      await libro.xlsx.load(buffer as unknown as ArrayBuffer);

      expect(libro.worksheets.map((hoja) => hoja.name)).toEqual([
        'estudiantes',
        'instrucciones',
      ]);
      const instrucciones = libro.getWorksheet('instrucciones')!;
      expect(instrucciones.getRow(1).values).toEqual(
        expect.arrayContaining(['columna', 'tipo', 'obligatoria', 'valores permitidos', 'ejemplo']),
      );
      const columnasInstrucciones: string[] = [];
      for (let fila = 2; fila <= instrucciones.rowCount; fila++) {
        columnasInstrucciones.push(String(instrucciones.getRow(fila).getCell(1).value ?? ''));
      }
      expect(columnasInstrucciones).toEqual(ENCABEZADOS_NUEVOS.estudiantes);
    });

    it('el ejemplo JSON trae 2 registros con las claves del esquema', async () => {
      const ejemplo = await servicio.generarPlantillaJson('estudiantes');

      expect(ejemplo.registros).toHaveLength(2);
      expect(Object.keys(ejemplo.registros[0])).toEqual(
        expect.arrayContaining(['programa', 'genero', 'facultad', 'semestre', 'estrato', 'codigo_estudiante', 'periodo_academico']),
      );
      expect(Object.keys(ejemplo.registros[0])).not.toContain('valor_dimension');
    });
  });
});
