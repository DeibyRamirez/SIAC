import { ValidateBy } from 'class-validator';

/** Límite de caracteres de los campos de texto largo (observaciones, comentarios). Igual que el frontend. */
export const LIMITE_TEXTO_LARGO = 600;

/**
 * Máximo de 600 caracteres con mensaje en español. Ausente (undefined/null) pasa: la
 * obligatoriedad la deciden @IsOptional / validadores propios del campo.
 */
export function MaxTextoLargo(campo: string): PropertyDecorator {
  return ValidateBy({
    name: 'maxTextoLargo',
    validator: {
      validate: (valor: unknown) =>
        valor === undefined || valor === null || (typeof valor === 'string' && valor.length <= LIMITE_TEXTO_LARGO),
      defaultMessage: () => `${campo}: máximo ${LIMITE_TEXTO_LARGO} caracteres.`,
    },
  });
}
