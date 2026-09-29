import { Module } from '@nestjs/common';
import { ProgramasModule } from '../programas/programas.module';
import { InstitucionRepositorio } from './institucion.repositorio';
import { InstitucionesController } from './instituciones.controller';
import { InstitucionesService } from './instituciones.service';

@Module({
  imports: [ProgramasModule],
  controllers: [InstitucionesController],
  providers: [InstitucionesService, InstitucionRepositorio],
  exports: [InstitucionesService],
})
export class InstitucionesModule {}
