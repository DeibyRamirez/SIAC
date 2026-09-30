import { Module } from '@nestjs/common';
import { ProgramasController } from './programas.controller';
import { ProgramasService, ProgramaRepositorio } from './programas.service';
import { AvanceProgramaService } from './avance-programa.service';
import { AvanceProcesoSIACService } from './avance-proceso-siac.service';
import { PanelProgramasService } from './panel-programas.service';
import { AlcanceProgramaModule } from '../common/alcance/alcance-programa.module';

@Module({
  imports: [AlcanceProgramaModule],
  controllers: [ProgramasController],
  providers: [
    ProgramasService,
    ProgramaRepositorio,
    AvanceProgramaService,
    AvanceProcesoSIACService,
    PanelProgramasService,
  ],
  exports: [
    ProgramasService,
    ProgramaRepositorio,
    AvanceProgramaService,
    AvanceProcesoSIACService,
    PanelProgramasService,
  ],
})
export class ProgramasModule {}
