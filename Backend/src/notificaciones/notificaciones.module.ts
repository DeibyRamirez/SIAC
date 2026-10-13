import { Module } from '@nestjs/common';
import { CorreoModule } from '../correo/correo.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { NotificacionesAvanceService } from './notificaciones-avance.service';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesDestinatariosService } from './notificaciones-destinatarios.service';
import { NotificacionesDespachoService } from './notificaciones-despacho.service';
import { NotificacionesService } from './notificaciones.service';

@Module({
  imports: [CorreoModule, UsuariosModule],
  controllers: [NotificacionesController],
  providers: [
    NotificacionesService,
    NotificacionesDespachoService,
    NotificacionesDestinatariosService,
    NotificacionesAvanceService,
  ],
  exports: [
    NotificacionesService,
    NotificacionesDespachoService,
    NotificacionesDestinatariosService,
    NotificacionesAvanceService,
  ],
})
export class NotificacionesModule {}
