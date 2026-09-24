import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { CategoriaPlantilla, FormatoArchivo, TipoTramitePlantilla } from '@prisma/client';

export class CrearPlantillaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  factor!: string;

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

  @IsBoolean()
  @IsOptional()
  esGuiaDocumentoMaestro?: boolean;
}

export class ActualizarPlantillaDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  factor?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsBoolean()
  @IsOptional()
  vigente?: boolean;

  @IsEnum(TipoTramitePlantilla)
  @IsOptional()
  tipoTramite?: TipoTramitePlantilla;

  @IsBoolean()
  @IsOptional()
  esGuiaDocumentoMaestro?: boolean;
}
