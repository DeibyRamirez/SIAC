import { Controller, Get, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ConsultaSalidaNotificacionesDto } from './dto/consulta-salida-notificaciones.dto';
import { NotificacionesService } from './notificaciones.service';
import { ApiContrato } from '../openapi/api-contrato';
import { MarcaLeidaDto, PaginaSalidaDto } from '../openapi/modelos-respuesta';

@ApiTags('Notificaciones')
@Controller('notificaciones')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get()
  @ApiContrato({
    resumen: 'Lista las alertas en la aplicación del usuario',
    roles: ['autenticado'],
    descripcionRespuesta: 'Hasta 50 alertas, de la más reciente a la más antigua. No usa pagina.',
  })
  listar(@Request() req: { user: { id: string } }) {
    return this.notificacionesService.listarPorUsuario(req.user.id);
  }

  /** C-8 (T-007.3e): bitácora del outbox de correo; Administrador/SuperAdmin, paginada. */
  @Get('salida')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Bitácora del outbox de correo',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: PaginaSalidaDto,
    detalle: 'No incluye el payload del correo. page por defecto 1, limit por defecto 20 y máximo 100.',
  })
  listarSalida(@Query() consulta: ConsultaSalidaNotificacionesDto) {
    return this.notificacionesService.listarSalida(consulta);
  }

  @Patch('marcar-todas-leidas')
  @ApiContrato({
    resumen: 'Marca como leídas las alertas del usuario',
    roles: ['autenticado'],
    respuesta: MarcaLeidaDto,
  })
  marcarTodasLeidas(@Request() req: { user: { id: string } }) {
    return this.notificacionesService.marcarTodasLeidas(req.user.id);
  }

  @Patch(':id/leida')
  @ApiContrato({
    resumen: 'Marca una alerta como leída',
    roles: ['autenticado'],
    respuesta: MarcaLeidaDto,
    detalle: 'Solo actualiza la alerta si pertenece al usuario. count=0 si no coincide.',
  })
  marcarLeida(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.notificacionesService.marcarLeida(id, req.user.id);
  }
}
