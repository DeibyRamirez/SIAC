import { Module } from '@nestjs/common';
import { PlantillasController } from './plantillas.controller';
import { PlantillasService } from './plantillas.service';
import { PlantillaRepositorio } from './plantilla.repositorio';

@Module({
  controllers: [PlantillasController],
  providers: [PlantillasService, PlantillaRepositorio],
  exports: [PlantillasService, PlantillaRepositorio],
})
export class PlantillasModule {}
