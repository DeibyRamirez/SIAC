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
  @IsString()
  @IsNotEmpty({ message: 'El título del anexo es obligatorio.' })
  @MaxLength(200)
  titulo!: string;

  @IsString()
  @IsNotEmpty({ message: 'El programa es obligatorio.' })
  programaId!: string;

  @IsEnum(CategoriaAnexo, { message: 'La categoría debe ser Infraestructura, Permiso, Convenio u Otro.' })
  categoria!: CategoriaAnexo;

  @IsString()
  @IsNotEmpty({ message: 'Vincule el anexo a la evidencia que respalda.' })
  evidenciaId!: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'La fecha de vencimiento debe tener el formato AAAA-MM-DD.' })
  fechaVencimiento?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'La fecha de expedición debe tener el formato AAAA-MM-DD.' })
  fechaExpedicion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  aniosVigencia?: number;

  @IsString()
  @IsNotEmpty({ message: 'El responsable es obligatorio.' })
  responsable!: string;

  /** Descripción libre (opcional); RN-003 usa `categoria`, no este texto. */
  @IsOptional()
  @IsString()
  @MaxLength(150)
  tipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  carpeta?: string;
}

export class ActualizarAnexoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  fechaVencimiento?: string;

  @IsOptional()
  @IsString()
  responsable?: string;

  @IsOptional()
  @IsEnum(CategoriaAnexo)
  categoria?: CategoriaAnexo;

  /** Permite vincular a una evidencia los anexos históricos que no la tenían. */
  @IsOptional()
  @IsString()
  evidenciaId?: string;
}
