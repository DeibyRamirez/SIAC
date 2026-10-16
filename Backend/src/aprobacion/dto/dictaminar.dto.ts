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
  @IsEnum(CodigoCondicionDocumentoMaestro)
  codigo!: CodigoCondicionDocumentoMaestro;

  @IsBoolean()
  cumple!: boolean;

  @ObservacionObligatoriaSiNoCumple((codigo) =>
    etiquetaCondicion(codigo as CodigoCondicionDocumentoMaestro),
  )
  observacion?: string;
}

export class CondicionInstitucionalDictamenDto {
  @IsEnum(CodigoCondicionInstitucional)
  codigo!: CodigoCondicionInstitucional;

  @IsBoolean()
  cumple!: boolean;

  @ObservacionObligatoriaSiNoCumple((codigo) =>
    etiquetaCondicionInstitucional(codigo as CodigoCondicionInstitucional),
  )
  observacion?: string;
}

export class ComentarioInlineDto {
  @IsString()
  @IsOptional()
  hunkId?: string;

  @IsString()
  @IsOptional()
  anchor?: string;

  @IsString()
  @IsOptional()
  quote?: string;

  @IsString()
  @IsOptional()
  cita?: string;

  @IsString()
  texto!: string;

  @IsString()
  @IsOptional()
  createdAt?: string;
}

export class DictaminarDto {
  @IsEnum(EstadoEvidencia)
  @IsOptional()
  estado?: EstadoEvidencia;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CondicionDictamenDto)
  @IsOptional()
  condiciones?: CondicionDictamenDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CondicionInstitucionalDictamenDto)
  @IsOptional()
  condicionesInstitucionales?: CondicionInstitucionalDictamenDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComentarioInlineDto)
  @IsOptional()
  comentariosInline?: ComentarioInlineDto[];
}
