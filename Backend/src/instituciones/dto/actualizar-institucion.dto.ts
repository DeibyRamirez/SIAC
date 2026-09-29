import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TipoTramiteSIAC } from '@prisma/client';
import { TRAMITES_INSTITUCIONALES } from '../../dominio/alcance-guia';

export class ActualizarInstitucionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sigla?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  urlImagen?: string;

  /** Solo trámites de condiciones institucionales (G3 o G3 + G4). */
  @IsOptional()
  @IsEnum(TipoTramiteSIAC)
  @IsIn(TRAMITES_INSTITUCIONALES as TipoTramiteSIAC[], {
    message: 'La institución solo admite trámites de condiciones institucionales.',
  })
  tipoTramiteActivo?: TipoTramiteSIAC;
}
