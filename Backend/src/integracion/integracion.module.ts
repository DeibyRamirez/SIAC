import { Module } from '@nestjs/common';
import { IntegracionController } from './integracion.controller';
import { IntegracionService } from './integracion.service';
import { ClienteCarrerasCuacService } from './cliente-carreras-cuac.service';
import { AlmacenamientoModule } from '../almacenamiento/almacenamiento.module';

@Module({
  imports: [AlmacenamientoModule],
  controllers: [IntegracionController],
  providers: [IntegracionService, ClienteCarrerasCuacService],
  exports: [IntegracionService, ClienteCarrerasCuacService],
})
export class IntegracionModule {}
