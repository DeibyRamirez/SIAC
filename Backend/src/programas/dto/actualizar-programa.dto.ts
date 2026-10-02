import { TipoTramiteSIAC } from '@prisma/client';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ActualizarProgramaDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @IsIn(['Pregrado', 'Posgrado'])
  nivel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  facultad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  modalidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigoSnies?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  duracionSemestres?: number;

  @IsOptional()
  @IsEnum(TipoTramiteSIAC)
  tipoTramiteActivo?: TipoTramiteSIAC;
}

export class ActualizarEstadoProgramaDto {
  @IsBoolean()
  activo!: boolean;
}
