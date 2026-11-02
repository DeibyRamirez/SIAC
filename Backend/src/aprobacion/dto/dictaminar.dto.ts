import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateBy,
  ValidationArguments,
  ValidationOptions,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CodigoCondicionDocumentoMaestro,
  CodigoCondicionInstitucional,
  EstadoEvidencia,
} from '@prisma/client';
import { MaxTextoLargo } from '../../common/validacion/limites-texto';
import { etiquetaCondicion } from '../../dominio/condiciones-documento-maestro';
import { etiquetaCondicionInstitucional } from '../../dominio/condiciones-institucionales';

type CodigoCondicion =
  | CodigoCondicionDocumentoMaestro
  | CodigoCondicionInstitucional;

/**
 * T-006.1: toda condición con `cumple=false` exige una observación no vacía (trim).
 * Con `cumple=true` la observación es opcional (si se envía, debe ser texto).
 * El mensaje usa la etiqueta de la condición para que el revisor sepa cuál corregir.
 */
function ObservacionObligatoriaSiNoCumple(
  etiqueta: (codigo: CodigoCondicion) => string,
  opciones?: ValidationOptions,
) {
  return ValidateBy(
    {
      name: 'observacionObligatoriaSiNoCumple',
      validator: {
        validate(valor: unknown, args: ValidationArguments): boolean {
          const objeto = args.object as { cumple?: boolean };
          if (valor === undefined || valor === null) {
            return objeto.cumple !== false;
          }
          if (typeof valor !== 'string') return false;
          if (objeto.cumple === false) return valor.trim().length > 0;
          return true;
        },
        defaultMessage(args: ValidationArguments): string {
          const objeto = args.object as { codigo?: CodigoCondicion };
          const nombre = objeto.codigo ? etiqueta(objeto.codigo) : 'evaluada';
          return `La condición ${nombre} requiere una observación.`;
        },
      },
    },
    opciones,
  );
}

export class CondicionDictamenDto {
  @ApiProperty({ enum: CodigoCondicionDocumentoMaestro })
  @IsEnum(CodigoCondicionDocumentoMaestro)
  codigo!: CodigoCondicionDocumentoMaestro;

  @ApiProperty()
  @IsBoolean()
  cumple!: boolean;

  @ApiPropertyOptional({ maxLength: 600, description: 'Obligatoria y no vacía cuando cumple es false.' })
  @ObservacionObligatoriaSiNoCumple((codigo) =>
    etiquetaCondicion(codigo as CodigoCondicionDocumentoMaestro),
  )
  @MaxTextoLargo('La observación')
  observacion?: string;
}

export class CondicionInstitucionalDictamenDto {
  @ApiProperty({ enum: CodigoCondicionInstitucional })
  @IsEnum(CodigoCondicionInstitucional)
  codigo!: CodigoCondicionInstitucional;

  @ApiProperty()
  @IsBoolean()
  cumple!: boolean;

  @ApiPropertyOptional({ maxLength: 600, description: 'Obligatoria y no vacía cuando cumple es false.' })
  @ObservacionObligatoriaSiNoCumple((codigo) =>
    etiquetaCondicionInstitucional(codigo as CodigoCondicionInstitucional),
  )
  @MaxTextoLargo('La observación')
  observacion?: string;
}

export class ComentarioInlineDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  hunkId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  anchor?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  quote?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cita?: string;

  @ApiProperty({ maxLength: 600 })
  @IsString()
  @MaxTextoLargo('El comentario')
  texto!: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsString()
  @IsOptional()
  createdAt?: string;
}

export class DictaminarDto {
  @ApiPropertyOptional({ enum: EstadoEvidencia, description: 'Validado o Rechazado cuando el dictamen es explícito.' })
  @IsEnum(EstadoEvidencia)
  @IsOptional()
  estado?: EstadoEvidencia;

  @ApiPropertyOptional({ maxLength: 600 })
  @IsString()
  @IsOptional()
  @MaxTextoLargo('Las observaciones')
  observaciones?: string;

  @ApiPropertyOptional({ type: [CondicionDictamenDto], description: 'Checklist G1 (9 condiciones).' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CondicionDictamenDto)
  @IsOptional()
  condiciones?: CondicionDictamenDto[];

  @ApiPropertyOptional({
    type: [CondicionInstitucionalDictamenDto],
    description: 'Checklist G3 (6 condiciones).',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CondicionInstitucionalDictamenDto)
  @IsOptional()
  condicionesInstitucionales?: CondicionInstitucionalDictamenDto[];

  @ApiPropertyOptional({ type: [ComentarioInlineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComentarioInlineDto)
  @IsOptional()
  comentariosInline?: ComentarioInlineDto[];
}
