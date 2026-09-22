import { Module } from '@nestjs/common';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { EvidenciaRepositorio } from './evidencia.repositorio';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [NotificacionesModule],
  controllers: [DocumentosController],
  providers: [DocumentosService, EvidenciaRepositorio],
  exports: [DocumentosService, EvidenciaRepositorio],
})
export class DocumentosModule {}
