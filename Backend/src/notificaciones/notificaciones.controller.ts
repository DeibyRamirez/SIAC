import { Controller, Get, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolUsuario } from '@prisma/client';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ConsultaSalidaNotificacionesDto } from './dto/consulta-salida-notificaciones.dto';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get()
  listar(@Request() req: { user: { id: string } }) {
    return this.notificacionesService.listarPorUsuario(req.user.id);
  }

  /** C-8 (T-007.3e): bitácora del outbox de correo; Administrador/SuperAdmin, paginada. */
  @Get('salida')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  listarSalida(@Query() consulta: ConsultaSalidaNotificacionesDto) {
    return this.notificacionesService.listarSalida(consulta);
  }

  @Patch('marcar-todas-leidas')
  marcarTodasLeidas(@Request() req: { user: { id: string } }) {
    return this.notificacionesService.marcarTodasLeidas(req.user.id);
  }

  @Patch(':id/leida')
  marcarLeida(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.notificacionesService.marcarLeida(id, req.user.id);
  }
}
