import { validate } from 'class-validator';
import { ActualizarEvidenciaDto, CrearEvidenciaDto } from './evidencia.dto';

describe('validación del periodo en evidencias', () => {
  it('acepta AAAA-1 y AAAA-2 al crear', async () => {
    const dto = new CrearEvidenciaDto();
    dto.nombre = 'Documento maestro';
    dto.periodo = '2026-2';
    const errores = await validate(dto);
    expect(errores.find((error) => error.property === 'periodo')).toBeUndefined();
  });

  it('rechaza un semestre distinto de 1 o 2 con mensaje en español', async () => {
    const dto = new CrearEvidenciaDto();
    dto.nombre = 'Documento maestro';
    dto.periodo = '2026-3';
    const errores = await validate(dto);
    const periodo = errores.find((error) => error.property === 'periodo');
    expect(periodo).toBeDefined();
    expect(Object.values(periodo?.constraints ?? {}).join(' ')).toMatch(/AAAA-1 o AAAA-2/);
  });

  it('rechaza texto libre al actualizar', async () => {
    const dto = new ActualizarEvidenciaDto();
    dto.periodo = 'primer semestre';
    const errores = await validate(dto);
    expect(errores.some((error) => error.property === 'periodo')).toBe(true);
  });

  it('permite omitir el periodo al actualizar', async () => {
    const dto = new ActualizarEvidenciaDto();
    dto.nombre = 'Nuevo nombre';
    const errores = await validate(dto);
    expect(errores.find((error) => error.property === 'periodo')).toBeUndefined();
  });
});
