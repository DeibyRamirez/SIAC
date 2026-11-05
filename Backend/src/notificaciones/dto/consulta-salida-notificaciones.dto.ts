import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoNotificacionSalida } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

/** C-8: consulta de la bitácora de salida de correo (solo Administrador/SuperAdmin). */
export class ConsultaSalidaNotificacionesDto {
  @ApiPropertyOptional({ enum: EstadoNotificacionSalida })
  @IsOptional()
  @IsEnum(EstadoNotificacionSalida, {
    message: 'estado debe ser Pendiente, Enviado, Fallido o Descartado.',
  })
  estado?: EstadoNotificacionSalida;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
