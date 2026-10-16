import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * T-007.3a: umbrales de vigencia configurables en `ConfiguracionSIAC`.
 * Regla del PO: mesesAvisoVigencia > mesesRojoVigencia ≥ 0.
 */
export class ActualizarUmbralesVigenciaDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'mesesAvisoVigencia debe ser un entero.' })
  @Min(1, { message: 'mesesAvisoVigencia debe ser mayor que 0.' })
  @Max(120, { message: 'mesesAvisoVigencia no puede superar 120 meses.' })
  mesesAvisoVigencia?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'mesesRojoVigencia debe ser un entero.' })
  @Min(0, { message: 'mesesRojoVigencia no puede ser negativo.' })
  @Max(119, { message: 'mesesRojoVigencia no puede superar 119 meses.' })
  mesesRojoVigencia?: number;
}
