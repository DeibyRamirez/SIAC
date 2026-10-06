import { Module } from '@nestjs/common';
import { ProgramasController } from './programas.controller';
import { InstitucionController } from './institucion.controller';
import { ProgramasService, ProgramaRepositorio } from './programas.service';
import { InstitucionService } from './institucion.service';
import { AvanceProgramaService } from './avance-programa.service';
import { AvanceProcesoSIACService } from './avance-proceso-siac.service';
import { PanelProgramasService } from './panel-programas.service';
import { ResolucionMenService } from './resolucion-men.service';
import { AlcanceProgramaModule } from '../common/alcance/alcance-programa.module';

@Module({
  imports: [AlcanceProgramaModule],
  controllers: [ProgramasController, InstitucionController],
  providers: [
    ProgramasService,
    ProgramaRepositorio,
    InstitucionService,
    AvanceProgramaService,
    AvanceProcesoSIACService,
    PanelProgramasService,
    ResolucionMenService,
  ],
  exports: [
    ProgramasService,
    ProgramaRepositorio,
    InstitucionService,
    AvanceProgramaService,
    AvanceProcesoSIACService,
    PanelProgramasService,
  ],
})
export class ProgramasModule {}
