import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlcanceTramiteSIAC, OrigenDato, TipoTramiteSIAC } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export type EstadoFiltroPanel = 'activos' | 'inactivos' | 'todos';

export class ConsultaPanelProgramasDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: TipoTramiteSIAC })
  @IsOptional()
  @IsEnum(TipoTramiteSIAC)
  tramite?: TipoTramiteSIAC;

  @ApiPropertyOptional({ enum: AlcanceTramiteSIAC, default: AlcanceTramiteSIAC.Programa })
  @IsOptional()
  @IsEnum(AlcanceTramiteSIAC)
  alcance?: AlcanceTramiteSIAC = AlcanceTramiteSIAC.Programa;

  @ApiPropertyOptional({
    description: 'Si se envía, el semáforo se calcula en memoria y la paginación ocurre después del filtro.',
  })
  @IsOptional()
  @IsString()
  semaforo?: string;

  @ApiPropertyOptional({ example: '2026-1' })
  @IsOptional()
  @IsString()
  semestre?: string;

  /** R-010.3c: búsqueda por nombre o código en el servidor (antes se filtraba solo la página en el cliente). */
  @ApiPropertyOptional({ description: 'Nombre o código del programa.' })
  @IsOptional()
  @IsString()
  q?: string;

  /** Solo administradores: activos (default), inactivos o todos. */
  @ApiPropertyOptional({ enum: ['activos', 'inactivos', 'todos'] })
  @IsOptional()
  @IsIn(['activos', 'inactivos', 'todos'])
  estado?: EstadoFiltroPanel;

  /** Filtrar por origen del catálogo (p. ej. solo programas sincronizados desde API). */
  @ApiPropertyOptional({ enum: OrigenDato })
  @IsOptional()
  @IsEnum(OrigenDato)
  origen?: OrigenDato;
}
