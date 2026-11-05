import { ESQUEMAS_CIFRAS } from './indice';
import { validarLoteCifras } from './validador';

const estudiante = {
  programa: 'Ingeniería Agropecuaria',
  genero: 'Femenino',
  facultad: 'Facultad de Ciencias Agrarias',
  semestre: 5,
  estrato: 2,
  valor_dimension: 1,
  codigo_estudiante: '2020002350129',
  periodo_academico: '2026-1',
  nombre_estudiante: 'Ana Pérez',
};

describe('validación de cifras por categoría', () => {
  it('acepta un estudiante y conserva el dato personal para guardarlo', () => {
    const resultado = validarLoteCifras(ESQUEMAS_CIFRAS.estudiantes, [estudiante]);
    expect(resultado.filasError).toBe(0);
    expect(resultado.filasOk).toBe(1);
    expect(resultado.filas[0].ambito).toBe('2026-1');
    expect(resultado.filas[0].datos.nombre_estudiante).toBe('Ana Pérez');
    expect(resultado.filas[0].datos.codigo_estudiante).toBe('2020002350129');
  });

  it('acepta la errata falcultad de la plantilla como facultad', () => {
    const { facultad: _facultad, ...resto } = estudiante;
    const resultado = validarLoteCifras(ESQUEMAS_CIFRAS.estudiantes, [
      { ...resto, falcultad: 'Facultad de Ciencias Agrarias' },
    ]);
    expect(resultado.errores).toEqual([]);
    expect(resultado.filas[0].datos.facultad).toBe('Facultad de Ciencias Agrarias');
  });

  it('rechaza el lote completo si una fila tiene un valor no permitido', () => {
    const resultado = validarLoteCifras(ESQUEMAS_CIFRAS.estudiantes, [
      estudiante,
      { ...estudiante, genero: 'Otro', codigo_estudiante: '2' },
    ]);
    expect(resultado.filas).toEqual([]);
    expect(resultado.filasOk).toBe(1);
    expect(resultado.filasError).toBe(1);
    expect(resultado.errores).toEqual([
      expect.objectContaining({
        fila: 2,
        columna: 'genero',
        mensaje: expect.stringContaining('Femenino, Masculino, No binario, No informa'),
      }),
    ]);
  });

  it('exige un solo periodo y rellena el del lote cuando la fila no lo trae', () => {
    const sinPeriodo = { ...estudiante };
    delete (sinPeriodo as { periodo_academico?: string }).periodo_academico;
    const completo = validarLoteCifras(ESQUEMAS_CIFRAS.estudiantes, [sinPeriodo], '2026');
    expect(completo.filas[0].datos.periodo_academico).toBe('2026');

    const mezclado = validarLoteCifras(ESQUEMAS_CIFRAS.estudiantes, [
      estudiante,
      { ...estudiante, periodo_academico: '2026-2', codigo_estudiante: '9' },
    ]);
    expect(mezclado.filas).toEqual([]);
    expect(mezclado.errores[0].mensaje).toContain('un solo periodo');
  });

  it('valida egresados por graduados_periodo y profesores sin periodo final', () => {
    const egresado = validarLoteCifras(ESQUEMAS_CIFRAS.egresados, [
      {
        programa: 'Fonoaudiología',
        genero: 'Masculino',
        facultad: 'Facultad de Ciencias de la Salud',
        graduados_periodo: '2023-1',
        estrato: 2,
        grado: 'Profesional',
        nivel: 'Pregrado',
      },
    ]);
    expect(egresado.filas[0].ambito).toBe('2023-1');

    const profesor = validarLoteCifras(ESQUEMAS_CIFRAS.profesores, [
      {
        programa: 'Ingeniería de Sistemas',
        genero: 'Femenino',
        facultad: 'Facultad de Ingeniería Electrónica y Telecomunicaciones',
        periodo_inicio: '2018-1',
        periodo_academico: '2023-2',
        estrato: '3',
      },
    ]);
    expect(profesor.errores).toEqual([]);
    expect(profesor.filas[0].datos.periodo_final).toBeUndefined();
    expect(profesor.filas[0].datos.estrato).toBe(3);
  });

  it('corrige la errata cantidad estudianes y exige que las banderas de aseguramiento sumen 1', () => {
    const investigacion = validarLoteCifras(ESQUEMAS_CIFRAS.investigacion, [
      {
        facultad: 'Facultad de Artes',
        'grupo de investigacion': 'Grupo de ejemplo',
        semillero: 'Sin dato',
        'periodo academico': '2023-2',
        'cantidad estudianes': 4,
        genero: 'Femenino',
        programa: 'Artes Plásticas',
      },
    ]);
    expect(investigacion.filas[0].datos.cantidad_estudiantes).toBe(4);

    const mal = validarLoteCifras(ESQUEMAS_CIFRAS.aseguramiento, [
      {
        periodo_academico: '2023-2',
        programas: 'Biología',
        facultad: 'Facultad de Ciencias Naturales, Exactas y de la Educación',
        grado: 'Profesional',
        nivel: 'Pregrado',
        acreditados: 1,
        acreditables: 1,
        registros_calificables: 0,
        inicio_siac: '2023-08-01',
        finalizacion_siac: '2023-12-15',
        snies: '224',
      },
    ]);
    expect(mal.filas).toEqual([]);
    expect(mal.errores[0].mensaje).toContain('deben sumar 1');
  });

  it('reemplaza infraestructura por una sola sede y solo acepta el estado de la plantilla', () => {
    const sede = {
      sede: 'Claustro El Carmen',
      direccion: 'Calle 5 # 4-70',
      numero_pisos: 2,
      estado: 'En uso',
      total_m2_area_construida: 10.126,
      total_m2_area_terreno: 8,
      cantidad_salones_clase: 1,
      area_m2_salon_clase: 1,
      cantidad_salas_sistemas: 0,
      area_m2_salas_sistemas: 0,
      cantidad_laboratorios: 0,
      area_m2_laboratorios: 0,
      cantidad_auditorios: 0,
      area_m2_auditorios: 0,
      cantidad_salas_lectura: 0,
      area_m2_salas_lectura: 0,
      cantidad_zonas_deportivas: 0,
      area_m2_zonas_deportivas: 0,
      cantidad_cafeterias: 0,
      cantidad_zonas_estudio: 0,
      cantidad_zonas_recreativas: 0,
    };
    const ok = validarLoteCifras(ESQUEMAS_CIFRAS.infraestructura, [sede]);
    expect(ok.filas[0].ambito).toBe('Claustro El Carmen');
    expect(ok.filas[0].datos.total_m2_area_construida).toBe(10.13);

    const otra = validarLoteCifras(ESQUEMAS_CIFRAS.infraestructura, [
      sede,
      { ...sede, sede: 'Otra sede' },
    ]);
    expect(otra.filas).toEqual([]);
    expect(otra.errores[0].mensaje).toContain('una sola sede');

    const estado = validarLoteCifras(ESQUEMAS_CIFRAS.infraestructura, [{ ...sede, estado: 'Cerrado' }]);
    expect(estado.errores[0].columna).toBe('estado');
  });

  it('valida bienestar en clave/valor aunque la plantilla no tenga esa hoja', () => {
    const resultado = validarLoteCifras(
      ESQUEMAS_CIFRAS.bienestar,
      [{ clave: 'participantes_programa_x', facultad: 'Facultad de Ingeniería', dimension: 'vinculacion', valor_dimension: 'convenio', valor: 120 }],
      '2026-1',
    );
    expect(resultado.filas[0].ambito).toBe('2026-1');
    expect(resultado.filas[0].datos.valor).toBe(120);
    expect(resultado.filas[0].datos.valor_dimension).toBe('convenio');
  });
});
