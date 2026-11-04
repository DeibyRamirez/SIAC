import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, Matches } from 'class-validator';
import { MAXIMO_FILAS_ENVIO, REGEX_PERIODO_CIFRAS, mensajePeriodoInvalido } from '../categorias';

export class EnvioCifrasDto {
  @ApiPropertyOptional({
    example: '2026-1',
    description: 'Periodo del lote (AAAA o AAAA-S). Obligatorio salvo infraestructura.',
  })
  @IsOptional()
  @IsString()
  @Matches(REGEX_PERIODO_CIFRAS, { message: mensajePeriodoInvalido() })
  periodo?: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    description: 'Filas en snake_case según el esquema de la categoría. Máximo 5000.',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'El lote debe traer al menos un registro.' })
  @ArrayMaxSize(MAXIMO_FILAS_ENVIO, { message: 'El lote no puede superar 5000 registros.' })
  registros!: Record<string, unknown>[];
}

export class ConsultaDatosCifrasDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  pagina?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  tamano?: string;

  @ApiPropertyOptional({ example: '2026-1' })
  @IsOptional()
  @IsString()
  periodo?: string;
}
