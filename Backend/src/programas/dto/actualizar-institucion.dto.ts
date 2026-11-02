import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoTramiteSIAC } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ActualizarInstitucionDto {
  @ApiPropertyOptional({ enum: TipoTramiteSIAC, description: 'Debe ser un trámite de alcance institucional (G3/G4).' })
  @IsOptional()
  @IsEnum(TipoTramiteSIAC)
  tipoTramiteActivo?: TipoTramiteSIAC;
}
