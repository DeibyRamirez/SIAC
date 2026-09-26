import { Module } from '@nestjs/common';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { EvidenciaRepositorio } from './evidencia.repositorio';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ProgramasModule } from '../programas/programas.module';
import { DocxModule } from '../docx/docx.module';
import { AlmacenamientoModule } from '../almacenamiento/almacenamiento.module';

@Module({
  imports: [NotificacionesModule, ProgramasModule, DocxModule, AlmacenamientoModule],
  controllers: [DocumentosController],
  providers: [DocumentosService, EvidenciaRepositorio],
  exports: [DocumentosService, EvidenciaRepositorio],
})
export class DocumentosModule {}
