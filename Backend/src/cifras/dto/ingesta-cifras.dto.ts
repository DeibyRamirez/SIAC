import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import {
  MENSAJE_PERIODO_INVALIDO,
  REGEX_PERIODO_CIFRAS,
} from '../periodo-cifras';

export class RegistroIngestaCifrasDto {
  @ApiProperty({ example: 'total_matriculados' })
  @IsString()
  @IsNotEmpty({ message: 'Cada registro debe indicar la clave de la variable.' })
  clave!: string;

  @ApiProperty({ example: 8420, oneOf: [{ type: 'number' }, { type: 'string' }] })
  @IsDefined({ message: 'Cada registro debe indicar el valor.' })
  valor!: number | string;

  @ApiPropertyOptional({ example: 'Ingeniería' })
  @IsOptional()
  @IsString()
  facultad?: string;

  @ApiPropertyOptional({ example: '1101' })
  @IsOptional()
  @IsString()
  programaCodigoSnies?: string;

  @ApiPropertyOptional({ example: 'Popayán' })
  @IsOptional()
  @IsString()
  sede?: string;

  @ApiPropertyOptional({ example: 'vinculacion' })
  @IsOptional()
  @IsString()
  dimension?: string;

  @ApiPropertyOptional({ example: 'Tiempo completo' })
  @IsOptional()
  @IsString()
  valorDimension?: string;
}

export class IngestaCifrasDto {
  @ApiProperty({ example: '2025-2', description: 'AAAA o AAAA-S (ej. 2025-2).' })
  @IsString()
  @Matches(REGEX_PERIODO_CIFRAS, { message: MENSAJE_PERIODO_INVALIDO })
  periodo!: string;

  @ApiProperty({ type: [RegistroIngestaCifrasDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistroIngestaCifrasDto)
  registros!: RegistroIngestaCifrasDto[];
}
