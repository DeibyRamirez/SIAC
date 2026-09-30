import { AlcanceTramiteSIAC, TipoTramiteSIAC } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ConsultaPanelProgramasDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(TipoTramiteSIAC)
  tramite?: TipoTramiteSIAC;

  @IsOptional()
  @IsEnum(AlcanceTramiteSIAC)
  alcance?: AlcanceTramiteSIAC = AlcanceTramiteSIAC.Programa;

  @IsOptional()
  @IsString()
  semaforo?: string;

  @IsOptional()
  @IsString()
  semestre?: string;
}
