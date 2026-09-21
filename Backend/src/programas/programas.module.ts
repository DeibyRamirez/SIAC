import { Module } from '@nestjs/common';
import { ProgramasController } from './programas.controller';
import { ProgramasService, ProgramaRepositorio } from './programas.service';

@Module({
  controllers: [ProgramasController],
  providers: [ProgramasService, ProgramaRepositorio],
  exports: [ProgramasService, ProgramaRepositorio],
})
export class ProgramasModule {}
