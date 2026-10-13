import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsString, Matches } from 'class-validator';
import {
  MENSAJE_PERIODO_INVALIDO,
  REGEX_PERIODO_CIFRAS,
} from '../periodo-cifras';

export class IngestaCifrasDto {
  @ApiPropertyOptional({
    example: '2025-2',
    description:
      'Requerido para bienestar y relaciones-entorno (formato clave/valor). En categorías por registros el periodo va en cada registro.',
  })
  @IsOptional()
  @IsString()
  @Matches(REGEX_PERIODO_CIFRAS, { message: MENSAJE_PERIODO_INVALIDO })
  periodo?: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    example: [
      {
        programa: 'Ingeniería Agropecuaria',
        genero: 'Femenino',
        facultad: 'Facultad de Ciencias Agrarias',
        semestre: 5,
        estrato: 2,
        codigo_estudiante: '2020002350129',
        periodo_academico: '2023-2',
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe enviar al menos un registro.' })
  registros!: Array<Record<string, unknown>>;
}
