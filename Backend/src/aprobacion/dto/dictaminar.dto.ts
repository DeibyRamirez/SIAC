import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoEvidencia } from '@prisma/client';

export class DictaminarDto {
  @IsEnum(EstadoEvidencia)
  estado!: EstadoEvidencia;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
