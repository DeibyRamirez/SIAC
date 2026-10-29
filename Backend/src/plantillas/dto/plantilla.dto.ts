import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({ enum: FormatoArchivo })
  @IsEnum(FormatoArchivo)
  formato!: FormatoArchivo;

  @ApiProperty({ example: '1.0' })
  @IsString()
  @IsNotEmpty()
  version!: string;

  @ApiProperty({ enum: CategoriaPlantilla })
  @IsEnum(CategoriaPlantilla)
  categoria!: CategoriaPlantilla;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({ enum: TipoTramitePlantilla })
  @IsEnum(TipoTramitePlantilla)
  @IsOptional()
  tipoTramite?: TipoTramitePlantilla;

  @ApiPropertyOptional({ description: 'En multipart se acepta true, false, "true", "false", "1" o "0".' })
  @Transform(({ value }) => transformarBooleanoMultipart(value))
  @IsBoolean()
  @IsOptional()
  esGuiaDocumentoMaestro?: boolean;

  @ApiProperty({ enum: CodigoDocumentoGuia })
  @IsEnum(CodigoDocumentoGuia)
  codigoGuia!: CodigoDocumentoGuia;
}

export class ActualizarPlantillaDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => transformarBooleanoMultipart(value))
  @IsBoolean()
  @IsOptional()
  vigente?: boolean;

  @ApiPropertyOptional({ enum: TipoTramitePlantilla })
  @IsEnum(TipoTramitePlantilla)
  @IsOptional()
  tipoTramite?: TipoTramitePlantilla;

  @ApiPropertyOptional()
  @Transform(({ value }) => transformarBooleanoMultipart(value))
  @IsBoolean()
  @IsOptional()
  esGuiaDocumentoMaestro?: boolean;

  @ApiPropertyOptional({ enum: CodigoDocumentoGuia })
  @IsEnum(CodigoDocumentoGuia)
  @IsOptional()
  codigoGuia?: CodigoDocumentoGuia;
}
