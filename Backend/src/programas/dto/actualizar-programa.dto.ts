import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoTramiteSIAC } from '@prisma/client';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ActualizarProgramaDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @ApiPropertyOptional({ enum: ['Pregrado', 'Posgrado'] })
  @IsOptional()
  @IsIn(['Pregrado', 'Posgrado'])
  nivel?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  facultad?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  modalidad?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigoSnies?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  duracionSemestres?: number;

  @ApiPropertyOptional({ enum: TipoTramiteSIAC })
  @IsOptional()
  @IsEnum(TipoTramiteSIAC)
  tipoTramiteActivo?: TipoTramiteSIAC;
}

export class ActualizarEstadoProgramaDto {
  @ApiProperty()
  @IsBoolean()
  activo!: boolean;
}
