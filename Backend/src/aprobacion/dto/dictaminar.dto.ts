import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CodigoCondicionDocumentoMaestro,
  CodigoCondicionInstitucional,
  EstadoEvidencia,
} from '@prisma/client';

export class CondicionDictamenDto {
  @IsEnum(CodigoCondicionDocumentoMaestro)
  codigo!: CodigoCondicionDocumentoMaestro;

  @IsBoolean()
  cumple!: boolean;

  @IsString()
  @IsOptional()
  observacion?: string;
}

export class CondicionInstitucionalDictamenDto {
  @IsEnum(CodigoCondicionInstitucional)
  codigo!: CodigoCondicionInstitucional;

  @IsBoolean()
  cumple!: boolean;

  @IsString()
  @IsOptional()
  observacion?: string;
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
}
