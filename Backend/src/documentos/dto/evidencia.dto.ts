import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { CodigoDocumentoGuia, EstadoEvidencia } from '@prisma/client';

export class CrearEvidenciaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  programaId!: string;

  @IsString()
  @IsNotEmpty()
  periodo!: string;

  @IsString()
  @IsOptional()
  responsable?: string;

  @IsString()
  @IsOptional()
  documentoRequeridoId?: string;

  @IsOptional()
  requiereChecklistMaestro?: string;

  @IsEnum(CodigoDocumentoGuia)
  @IsOptional()
  codigoGuia?: CodigoDocumentoGuia;
}

export class ActualizarEvidenciaDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  periodo?: string;

  @IsString()
  @IsOptional()
  responsable?: string;
}

export class DictaminarEvidenciaDto {
  @IsEnum(EstadoEvidencia)
  estado!: EstadoEvidencia;

  @IsString()
  @IsOptional()
  observaciones?: string;
}

export class FiltrosEvidenciaDto {
  @IsString()
  @IsOptional()
  programaId?: string;

  @IsString()
  @IsOptional()
  periodo?: string;

  @IsEnum(CodigoDocumentoGuia)
  @IsOptional()
  codigoGuia?: CodigoDocumentoGuia;

  @IsString()
  @IsOptional()
  estado?: string;

  @IsString()
  @IsOptional()
  busqueda?: string;

  @IsString()
  @IsOptional()
  pagina?: string;

  @IsString()
  @IsOptional()
  limite?: string;
}
