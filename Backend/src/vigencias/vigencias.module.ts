import { Module } from '@nestjs/common';
import { VigenciasController } from './vigencias.controller';
import { VigenciasService } from './vigencias.service';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { AlmacenamientoModule } from '../almacenamiento/almacenamiento.module';
import { PaquetesRegistroVigenciaService } from './paquetes-registro-vigencia.service';
import { EvaluadorVigenciaRegistroService } from './evaluador-vigencia-registro.service';
import { VigenciaDemoService } from './vigencia-demo.service';

@Module({
  imports: [NotificacionesModule, AlmacenamientoModule],
  controllers: [VigenciasController],
  providers: [
    VigenciasService,
    PaquetesRegistroVigenciaService,
    EvaluadorVigenciaRegistroService,
    VigenciaDemoService,
  ],
  exports: [VigenciasService, PaquetesRegistroVigenciaService, EvaluadorVigenciaRegistroService, VigenciaDemoService],
})
export class VigenciasModule {}
