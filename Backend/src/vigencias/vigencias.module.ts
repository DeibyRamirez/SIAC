import { Module } from '@nestjs/common';
import { VigenciasController } from './vigencias.controller';
import { VigenciasService } from './vigencias.service';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { AlmacenamientoModule } from '../almacenamiento/almacenamiento.module';

@Module({
  imports: [NotificacionesModule, AlmacenamientoModule],
  controllers: [VigenciasController],
  providers: [VigenciasService],
  exports: [VigenciasService],
})
export class VigenciasModule {}
