import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoriaAnexo } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Carga de un anexo de vigencia (R-D, decisión del PO 06/10): documento obligatorio, vinculado a la
 * evidencia que respalda, con categoría explícita y vencimiento tomado del certificado
 * (`fechaVencimiento`, o `fechaExpedicion` + `aniosVigencia`).
 */
export class CrearAnexoConArchivoDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty({ message: 'El título del anexo es obligatorio.' })
  @MaxLength(200)
  titulo!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'El programa es obligatorio.' })
  programaId!: string;

  @ApiProperty({ enum: CategoriaAnexo })
  @IsEnum(CategoriaAnexo, { message: 'La categoría debe ser Infraestructura, Permiso, Convenio u Otro.' })
  categoria!: CategoriaAnexo;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Vincule el anexo a la evidencia que respalda.' })
  evidenciaId!: string;

  @ApiPropertyOptional({ example: '2027-01-31' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'La fecha de vencimiento debe tener el formato AAAA-MM-DD.' })
  fechaVencimiento?: string;

  @ApiPropertyOptional({ example: '2026-01-31' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'La fecha de expedición debe tener el formato AAAA-MM-DD.' })
  fechaExpedicion?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  aniosVigencia?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'El responsable es obligatorio.' })
  responsable!: string;

  /** Descripción libre (opcional); RN-003 usa `categoria`, no este texto. */
  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  tipo?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  carpeta?: string;
}

export class ActualizarAnexoDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string;

  @ApiPropertyOptional({ example: '2027-01-31' })
  @IsOptional()
  @IsISO8601({ strict: true })
  fechaVencimiento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsable?: string;

  @ApiPropertyOptional({ enum: CategoriaAnexo })
  @IsOptional()
  @IsEnum(CategoriaAnexo)
  categoria?: CategoriaAnexo;

  /** Permite vincular a una evidencia los anexos históricos que no la tenían. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evidenciaId?: string;
}
