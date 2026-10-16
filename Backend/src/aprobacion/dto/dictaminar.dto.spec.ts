import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DictaminarDto } from './dictaminar.dto';

async function validar(dto: unknown) {
  return validate(plainToInstance(DictaminarDto, dto));
}

function mensajeObservacion(
  errores: Awaited<ReturnType<typeof validar>>,
): string | undefined {
  return errores
    .find((error) => error.property === 'condiciones')
    ?.children?.[0]?.children?.find((error) => error.property === 'observacion')
    ?.constraints?.observacionObligatoriaSiNoCumple;
}

describe('DictaminarDto · T-006.1 observación obligatoria', () => {
  it('rechaza cumple=false sin observación con el nombre de la condición', async () => {
    const errores = await validar({
      condiciones: [{ codigo: 'Denominacion', cumple: false }],
    });

    expect(mensajeObservacion(errores)).toMatch(
      /La condición Denominación del programa requiere una observación\./,
    );
  });

  it.each([undefined, '', '   '])(
    'rechaza cumple=false con observación %p',
    async (observacion) => {
      const errores = await validar({
        condiciones: [{ codigo: 'Justificacion', cumple: false, observacion }],
      });
      expect(mensajeObservacion(errores)).toContain('Justificación del programa');
    },
  );

  it('acepta cumple=false con observación', async () => {
    const errores = await validar({
      condiciones: [{ codigo: 'Denominacion', cumple: false, observacion: 'Falta soporte.' }],
    });
    expect(mensajeObservacion(errores)).toBeUndefined();
  });

  it('acepta cumple=true sin observación', async () => {
    const errores = await validar({
      condiciones: [{ codigo: 'Denominacion', cumple: true }],
    });
    expect(mensajeObservacion(errores)).toBeUndefined();
  });

  it('exige observación también en condiciones institucionales', async () => {
    const errores = await validar({
      condicionesInstitucionales: [
        { codigo: 'CulturaAutoevaluacion', cumple: false },
      ],
    });
    const mensaje = errores
      .find((error) => error.property === 'condicionesInstitucionales')
      ?.children?.[0]?.children?.find((error) => error.property === 'observacion')
      ?.constraints?.observacionObligatoriaSiNoCumple;
    expect(mensaje).toMatch(
      /La condición Cultura de la autoevaluación requiere una observación\./,
    );
  });
});
