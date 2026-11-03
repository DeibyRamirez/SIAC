import { ESQUEMAS_CIFRAS } from './esquemas/indice';
import { columnasExcluidasLectura, proyectarLecturaCifra } from './lectura-cifras';

describe('exclusión de campos personales', () => {
  it('omite nombre y código de estudiante y conserva el resto', () => {
    expect(columnasExcluidasLectura(ESQUEMAS_CIFRAS.estudiantes)).toEqual([
      'nombre_estudiante',
      'codigo_estudiante',
    ]);
    const lectura = proyectarLecturaCifra(ESQUEMAS_CIFRAS.estudiantes, {
      id: 'fila-1',
      integradorId: 'int-1',
      enviadoEn: new Date('2026-03-01T00:00:00.000Z'),
      nombreEstudiante: 'Ana Pérez',
      codigoEstudiante: '2020002350129',
      programa: 'Ingeniería Agropecuaria',
      genero: 'Femenino',
      facultad: 'Facultad de Ciencias Agrarias',
      semestre: 5,
      estrato: 2,
      valorDimension: 1,
      periodoAcademico: '2026-1',
    });
    expect(lectura).not.toHaveProperty('nombre_estudiante');
    expect(lectura).not.toHaveProperty('nombreEstudiante');
    expect(lectura).not.toHaveProperty('codigo_estudiante');
    expect(lectura).not.toHaveProperty('codigoEstudiante');
    expect(lectura.programa).toBe('Ingeniería Agropecuaria');
    expect(lectura.periodo_academico).toBe('2026-1');
    expect(JSON.stringify(lectura)).not.toContain('Ana Pérez');
    expect(JSON.stringify(lectura)).not.toContain('2020002350129');
  });

  it('omite el nombre de profesor y el de egresado, y no hay documento en ninguna categoría', () => {
    expect(columnasExcluidasLectura(ESQUEMAS_CIFRAS.profesores)).toEqual(['nombre_profesor']);
    expect(columnasExcluidasLectura(ESQUEMAS_CIFRAS.egresados)).toEqual(['nombre_egresado']);
    const personales = Object.values(ESQUEMAS_CIFRAS).flatMap((esquema) =>
      esquema.columnas.filter((columna) => columna.personal).map((columna) => columna.clave),
    );
    expect(personales).toEqual([
      'nombre_estudiante',
      'codigo_estudiante',
      'nombre_profesor',
      'nombre_egresado',
    ]);
    expect(personales.some((clave) => clave.includes('documento'))).toBe(false);
  });
});
