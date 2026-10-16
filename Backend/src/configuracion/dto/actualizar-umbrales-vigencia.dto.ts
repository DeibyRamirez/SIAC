import { Type } from 'class-transformer';
import {
  IsInt,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Máximo permitido para ambos umbrales (84 meses = 7 años de vigencia completa). */
export const MAX_MESES_UMBRAL_VIGENCIA = 84;

/** Valida en el DTO que el aviso sea estrictamente mayor que el rojo. */
@ValidatorConstraint({ name: 'avisoMayorQueRojo', async: false })
export class AvisoMayorQueRojoConstraint implements ValidatorConstraintInterface {
  validate(valor: number, argumentos: ValidationArguments): boolean {
    const dto = argumentos.object as ActualizarUmbralesVigenciaDto;
    if (typeof valor !== 'number' || typeof dto.mesesRojoVigencia !== 'number') return true;
    return valor > dto.mesesRojoVigencia;
  }

  defaultMessage(): string {
    return 'mesesAvisoVigencia debe ser mayor que mesesRojoVigencia (el aviso amarillo ocurre antes que el rojo).';
  }
}

/**
 * T-007.3a: umbrales de vigencia configurables en `ConfiguracionSIAC`.
 * Regla del PO: 1 ≤ mesesRojoVigencia < mesesAvisoVigencia ≤ 84 (vigencia completa de 7 años).
 */
export class ActualizarUmbralesVigenciaDto {
  @ApiProperty({
    description: 'Meses antes del fin de vigencia en que el semáforo pasa a amarillo.',
    minimum: 1,
    maximum: MAX_MESES_UMBRAL_VIGENCIA,
    example: 24,
  })
  @Type(() => Number)
  @IsInt({ message: 'mesesAvisoVigencia debe ser un entero.' })
  @Min(1, { message: 'mesesAvisoVigencia debe ser mayor que 0.' })
  @Max(MAX_MESES_UMBRAL_VIGENCIA, {
    message: `mesesAvisoVigencia no puede superar ${MAX_MESES_UMBRAL_VIGENCIA} meses.`,
  })
  @Validate(AvisoMayorQueRojoConstraint)
  mesesAvisoVigencia!: number;

  @ApiProperty({
    description: 'Meses antes del fin de vigencia en que el semáforo pasa a rojo.',
    minimum: 1,
    maximum: MAX_MESES_UMBRAL_VIGENCIA,
    example: 18,
  })
  @Type(() => Number)
  @IsInt({ message: 'mesesRojoVigencia debe ser un entero.' })
  @Min(1, { message: 'mesesRojoVigencia debe ser mayor que 0.' })
  @Max(MAX_MESES_UMBRAL_VIGENCIA, {
    message: `mesesRojoVigencia no puede superar ${MAX_MESES_UMBRAL_VIGENCIA} meses.`,
  })
  mesesRojoVigencia!: number;
}
