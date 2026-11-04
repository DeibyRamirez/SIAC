import { validarLoteCifras } from './esquemas-cifras';

const estudianteOk = {
  programa: 'Ingeniería Agropecuaria',
  genero: 'Femenino',
  facultad: 'Facultad de Ciencias Agrarias',
  semestre: 5,
  estrato: 2,
  codigo_estudiante: '2020002350129',
  periodo_academico: '2026-1',
};

describe('validarLoteCifras', () => {
  it('acepta un lote de estudiantes válido', () => {
    expect(validarLoteCifras('estudiantes', [estudianteOk], '2026-1')).toEqual([]);
  });

  it('rechaza un semestre fuera de rango', () => {
    const errores = validarLoteCifras(
      'estudiantes',
      [{ ...estudianteOk, semestre: 15 }],
      '2026-1',
    );
    expect(errores).toEqual([
      { fila: 1, columna: 'semestre', mensaje: 'El semestre debe estar entre 1 y 12.' },
    ]);
  });

  it('rechaza un periodo de fila distinto al del lote', () => {
    const errores = validarLoteCifras(
      'estudiantes',
      [{ ...estudianteOk, periodo_academico: '2025-2' }],
      '2026-1',
    );
    expect(errores[0]?.mensaje).toMatch(/coincidir con el periodo del lote/);
  });

  it('hereda el periodo del lote si la fila no lo trae', () => {
    const { periodo_academico: _omitido, ...sinPeriodo } = estudianteOk;
    expect(validarLoteCifras('estudiantes', [sinPeriodo], '2026-1')).toEqual([]);
  });

  it('acepta un lote de bienestar con periodo heredado', () => {
    expect(
      validarLoteCifras(
        'bienestar',
        [
          {
            clave: 'participantes_programa_x',
            facultad: 'Facultad de Ingeniería',
            dimension: 'vinculacion',
            valor_dimension: 'convenio',
            valor: 120,
          },
        ],
        '2026-1',
      ),
    ).toEqual([]);
  });

  it('acepta camelCase como alias', () => {
    expect(
      validarLoteCifras(
        'estudiantes',
        [
          {
            programa: 'Derecho',
            genero: 'Masculino',
            facultad: 'Derecho',
            semestre: 1,
            estrato: 3,
            codigoEstudiante: '1',
            periodoAcademico: '2026-1',
          },
        ],
        '2026-1',
      ),
    ).toEqual([]);
  });
});
