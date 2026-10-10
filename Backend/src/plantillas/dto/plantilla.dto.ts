import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import {
  CategoriaPlantilla,
  CodigoDocumentoGuia,
  FormatoArchivo,
  TipoTramitePlantilla,
} from '@prisma/client';

/** multipart/form-data envía booleanos como "true"/"false" (string). */
function transformarBooleanoMultipart(valor: unknown): boolean | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (valor === true || valor === 'true' || valor === '1') return true;
  if (valor === false || valor === 'false' || valor === '0') return false;
  return valor as boolean;
}

export class CrearPlantillaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsEnum(FormatoArchivo)
  formato!: FormatoArchivo;

  @IsString()
  @IsNotEmpty()
  version!: string;

  @IsEnum(CategoriaPlantilla)
  categoria!: CategoriaPlantilla;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsEnum(TipoTramitePlantilla)
  @IsOptional()
  tipoTramite?: TipoTramitePlantilla;

  @Transform(({ value }) => transformarBooleanoMultipart(value))
  @IsBoolean()
  @IsOptional()
  esGuiaDocumentoMaestro?: boolean;

  @IsEnum(CodigoDocumentoGuia)
  codigoGuia!: CodigoDocumentoGuia;
}

export class ActualizarPlantillaDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @Transform(({ value }) => transformarBooleanoMultipart(value))
  @IsBoolean()
  @IsOptional()
  vigente?: boolean;

  @IsEnum(TipoTramitePlantilla)
  @IsOptional()
  tipoTramite?: TipoTramitePlantilla;

  @Transform(({ value }) => transformarBooleanoMultipart(value))
  @IsBoolean()
  @IsOptional()
  esGuiaDocumentoMaestro?: boolean;

  @IsEnum(CodigoDocumentoGuia)
  @IsOptional()
  codigoGuia?: CodigoDocumentoGuia;
}
