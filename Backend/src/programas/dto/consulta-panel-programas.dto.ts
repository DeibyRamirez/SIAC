import { AlcanceTramiteSIAC, OrigenDato, TipoTramiteSIAC } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export type EstadoFiltroPanel = 'activos' | 'inactivos' | 'todos';

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

  /** R-010.3c: búsqueda por nombre o código en el servidor (antes se filtraba solo la página en el cliente). */
  @IsOptional()
  @IsString()
  q?: string;

  /** Solo administradores: activos (default), inactivos o todos. */
  @IsOptional()
  @IsIn(['activos', 'inactivos', 'todos'])
  estado?: EstadoFiltroPanel;

  /** Filtrar por origen del catálogo (p. ej. solo programas sincronizados desde API). */
  @IsOptional()
  @IsEnum(OrigenDato)
  origen?: OrigenDato;
}
