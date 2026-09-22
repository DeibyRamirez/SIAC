import { Module } from '@nestjs/common';
import { IntegracionController } from './integracion.controller';
import { IntegracionService } from './integracion.service';
import { AlmacenamientoModule } from '../almacenamiento/almacenamiento.module';

@Module({
  imports: [AlmacenamientoModule],
  controllers: [IntegracionController],
  providers: [IntegracionService],
  exports: [IntegracionService],
})
export class IntegracionModule {}
