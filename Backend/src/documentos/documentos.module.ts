import { Module } from '@nestjs/common';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { EvidenciaRepositorio } from './evidencia.repositorio';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ProgramasModule } from '../programas/programas.module';

@Module({
  imports: [NotificacionesModule, ProgramasModule],
  controllers: [DocumentosController],
  providers: [DocumentosService, EvidenciaRepositorio],
  exports: [DocumentosService, EvidenciaRepositorio],
})
export class DocumentosModule {}
