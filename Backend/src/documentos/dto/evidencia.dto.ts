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

  /** Obligatorio para G1/G2 (y documentos sin guía). No se envía en G3/G4. */
  @IsString()
  @IsOptional()
  programaId?: string;

  /** HU-010: G3/G4 se asocian a la institución. Si se omite, se usa la CUAC. */
  @IsString()
  @IsOptional()
  institucionId?: string;

  @IsString()
  @IsNotEmpty()
  periodo!: string;

  @IsString()
  @IsNotEmpty()
  factor!: string;

  @IsString()
  @IsNotEmpty()
  indicador!: string;

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
  factor?: string;

  @IsString()
  @IsOptional()
  indicador?: string;

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
  institucionId?: string;

  @IsString()
  @IsOptional()
  periodo?: string;

  @IsString()
  @IsOptional()
  factor?: string;

  @IsString()
  @IsOptional()
  indicador?: string;

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
