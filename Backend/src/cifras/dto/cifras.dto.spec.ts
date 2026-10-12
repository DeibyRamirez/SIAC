import { plainToInstance } from 'class-transformer';
import { ValidationError, validateSync } from 'class-validator';
import { MENSAJE_PERIODO_INVALIDO } from '../periodo-cifras';
import { ConsultaCifrasQueryDto } from './cifras.dto';
import { IngestaCifrasDto } from './ingesta-cifras.dto';

function validar<T extends object>(clase: new () => T, payload: object): ValidationError[] {
  return validateSync(plainToInstance(clase, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

function erroresDe(errores: ValidationError[], propiedad: string): string[] {
  return errores
    .filter((error) => error.property === propiedad)
    .flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('Validación de periodo en DTOs de cifras', () => {
  describe('ConsultaCifrasQueryDto', () => {
    it('rechaza periodo con formato inválido', () => {
      const errores = validar(ConsultaCifrasQueryDto, { periodo: 'abc' });
      expect(erroresDe(errores, 'periodo')).toEqual([MENSAJE_PERIODO_INVALIDO]);
    });

    it('rechaza un semestre distinto de 1 o 2', () => {
      const errores = validar(ConsultaCifrasQueryDto, { periodo: '2026-3' });
      expect(erroresDe(errores, 'periodo')).toEqual([MENSAJE_PERIODO_INVALIDO]);
    });

    it('acepta AAAA-S', () => {
      expect(validar(ConsultaCifrasQueryDto, { periodo: '2026-1' })).toHaveLength(0);
    });

    it('acepta AAAA', () => {
      expect(validar(ConsultaCifrasQueryDto, { periodo: '2026' })).toHaveLength(0);
    });

    it('acepta la consulta sin periodo', () => {
      expect(validar(ConsultaCifrasQueryDto, {})).toHaveLength(0);
    });
  });

  describe('IngestaCifrasDto', () => {
    it('rechaza periodo con formato inválido', () => {
      const errores = validar(IngestaCifrasDto, { periodo: '20-2', registros: [] });
      expect(erroresDe(errores, 'periodo')).toEqual([MENSAJE_PERIODO_INVALIDO]);
    });

    it('acepta periodo válido con registros', () => {
      const errores = validar(IngestaCifrasDto, {
        periodo: '2025-2',
        registros: [{ clave: 'por_vinculacion', valor: 10 }],
      });
      expect(errores).toHaveLength(0);
    });

    it('exige valor en cada registro', () => {
      const errores = validar(IngestaCifrasDto, {
        periodo: '2025-2',
        registros: [{ clave: 'por_vinculacion' }],
      });
      expect(errores).toHaveLength(1);
      expect(errores[0].property).toBe('registros');
      expect(errores[0].children?.[0].children?.[0].constraints).toMatchObject({
        isDefined: 'Cada registro debe indicar el valor.',
      });
    });
  });
});
