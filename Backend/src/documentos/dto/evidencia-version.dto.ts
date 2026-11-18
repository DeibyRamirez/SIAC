import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class UsuarioVersionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nombre!: string;
}

/** Resumen público de una versión: no expone rutas internas ni tokens de firma. */
export class EvidenciaVersionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  numero!: number;

  @ApiProperty()
  nombreArchivo!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  mimeType?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  tamanoBytes?: number | null;

  @ApiProperty()
  subidoPorId!: string;

  @ApiPropertyOptional({ enum: RolUsuario })
  subidoPorRol?: RolUsuario | null;

  @ApiPropertyOptional({ type: () => UsuarioVersionDto, nullable: true })
  subidoPor?: { id: string; nombre: string } | null;

  @ApiProperty()
  createdAt!: Date;
}

/** Respuesta de la validación de un candidato; no crea ni modifica versiones. */
export class ValidacionVersionRevisorDto {
  @ApiProperty()
  versionOrigen!: number;

  @ApiProperty()
  nuevaVersion!: number;

  @ApiProperty()
  nombreArchivo!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  tamanoBytes!: number;

  @ApiProperty()
  mensaje!: string;
}

/** Token leído en el navegador desde docProps/core.xml. */
export class VerificarFirmaDto {
  @ApiProperty({ description: 'Valor SIAC_FIRMA_VERSION extraído del .docx.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(600)
  firma!: string;
}

export class VerificacionFirmaDto {
  @ApiProperty()
  valida!: boolean;

  @ApiProperty()
  mensaje!: string;
}

/** Cuerpo multipart de la publicación del candidato. */
export class PublicarVersionRevisorDto {
  @ApiProperty({ description: 'Versión vigente sobre la que se preparó el candidato.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  versionOrigen!: number;
}
