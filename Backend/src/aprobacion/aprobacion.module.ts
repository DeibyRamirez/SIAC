import { Module } from '@nestjs/common';
import { AprobacionController } from './aprobacion.controller';
import { AprobacionService } from './aprobacion.service';
import { DocumentosModule } from '../documentos/documentos.module';
import { AlcanceProgramaModule } from '../common/alcance/alcance-programa.module';

@Module({
  imports: [DocumentosModule, AlcanceProgramaModule],
  controllers: [AprobacionController],
  providers: [AprobacionService],
  exports: [AprobacionService],
})
export class AprobacionModule {}
