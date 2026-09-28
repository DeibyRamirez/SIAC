import { Module } from '@nestjs/common';
import { ProgramasController } from './programas.controller';
import { ProgramasService, ProgramaRepositorio } from './programas.service';
import { AvanceProgramaService } from './avance-programa.service';
import { AlcanceProgramaModule } from '../common/alcance/alcance-programa.module';

@Module({
  imports: [AlcanceProgramaModule],
  controllers: [ProgramasController],
  providers: [ProgramasService, ProgramaRepositorio, AvanceProgramaService],
  exports: [ProgramasService, ProgramaRepositorio, AvanceProgramaService],
})
export class ProgramasModule {}
