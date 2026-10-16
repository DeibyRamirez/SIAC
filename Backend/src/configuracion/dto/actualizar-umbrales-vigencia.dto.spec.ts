import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActualizarUmbralesVigenciaDto } from './actualizar-umbrales-vigencia.dto';

async function erroresDe(datos: Record<string, unknown>) {
  return validate(plainToInstance(ActualizarUmbralesVigenciaDto, datos));
}

/** T-007.3a: el DTO exige 1..84 y mesesAvisoVigencia > mesesRojoVigencia. */
describe('ActualizarUmbralesVigenciaDto', () => {
  it('acepta un par coherente dentro de rango (24/18)', async () => {
    await expect(erroresDe({ mesesAvisoVigencia: 24, mesesRojoVigencia: 18 })).resolves.toHaveLength(0);
  });

  it('acepta valores enviados como texto (el formulario los castea)', async () => {
    await expect(erroresDe({ mesesAvisoVigencia: '30', mesesRojoVigencia: '6' })).resolves.toHaveLength(0);
  });

  it('rechaza aviso ≤ rojo con mensaje claro en mesesAvisoVigencia', async () => {
    const errores = await erroresDe({ mesesAvisoVigencia: 6, mesesRojoVigencia: 18 });
    expect(errores).toHaveLength(1);
    expect(errores[0].property).toBe('mesesAvisoVigencia');
    expect(JSON.stringify(errores[0].constraints)).toMatch(/mayor que mesesRojoVigencia/);
  });

  it('rechaza valores fuera del rango 1..84', async () => {
    const alto = await erroresDe({ mesesAvisoVigencia: 85, mesesRojoVigencia: 18 });
    expect(JSON.stringify(alto)).toMatch(/no puede superar 84 meses/);

    const cero = await erroresDe({ mesesAvisoVigencia: 24, mesesRojoVigencia: 0 });
    expect(JSON.stringify(cero)).toMatch(/mayor que 0/);
  });

  it('rechaza no enteros y campos faltantes', async () => {
    const decimal = await erroresDe({ mesesAvisoVigencia: 24.5, mesesRojoVigencia: 18 });
    expect(JSON.stringify(decimal)).toMatch(/debe ser un entero/);

    const faltante = await erroresDe({ mesesAvisoVigencia: 24 });
    expect(faltante.map((error) => error.property)).toContain('mesesRojoVigencia');
  });
});
