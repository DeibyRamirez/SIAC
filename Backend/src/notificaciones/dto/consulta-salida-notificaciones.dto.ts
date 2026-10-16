import { EstadoNotificacionSalida } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

/** C-8: consulta de la bitácora de salida de correo (solo Administrador/SuperAdmin). */
export class ConsultaSalidaNotificacionesDto {
  @IsOptional()
  @IsEnum(EstadoNotificacionSalida, {
    message: 'estado debe ser Pendiente, Enviado, Fallido o Descartado.',
  })
  estado?: EstadoNotificacionSalida;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
