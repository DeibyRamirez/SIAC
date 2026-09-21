import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { CategoriaPlantilla, FormatoArchivo } from '@prisma/client';

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
}

export class ActualizarPlantillaDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsBoolean()
  @IsOptional()
  vigente?: boolean;
}
