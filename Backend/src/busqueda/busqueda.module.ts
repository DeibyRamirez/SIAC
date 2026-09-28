import { Module } from '@nestjs/common';
import { BusquedaController } from './busqueda.controller';
import { BusquedaService } from './busqueda.service';
import { AlcanceProgramaModule } from '../common/alcance/alcance-programa.module';

@Module({
  imports: [AlcanceProgramaModule],
  controllers: [BusquedaController],
  providers: [BusquedaService],
  exports: [BusquedaService],
})
export class BusquedaModule {}
