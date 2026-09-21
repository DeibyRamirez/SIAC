import { Module } from '@nestjs/common';
import { AprobacionController } from './aprobacion.controller';
import { AprobacionService } from './aprobacion.service';
import { DocumentosModule } from '../documentos/documentos.module';

@Module({
  imports: [DocumentosModule],
  controllers: [AprobacionController],
  providers: [AprobacionService],
  exports: [AprobacionService],
})
export class AprobacionModule {}
