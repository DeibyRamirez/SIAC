import { Controller, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
@UseGuards(AuthGuard('jwt'))
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get()
  listar(@Request() req: { user: { id: string } }) {
    return this.notificacionesService.listarPorUsuario(req.user.id);
  }

  @Patch(':id/leida')
  marcarLeida(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.notificacionesService.marcarLeida(id, req.user.id);
  }
}
