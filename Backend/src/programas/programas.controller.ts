import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProgramasService } from './programas.service';
import { ProgramaRepositorio } from './programas.service';

@Controller('programas')
@UseGuards(AuthGuard('jwt'))
export class ProgramasController {
  constructor(
    private readonly programasService: ProgramasService,
    private readonly programaRepo: ProgramaRepositorio,
  ) {}

  @Get()
  listarConSemaforo() {
    return this.programasService.listarConSemaforo();
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.programaRepo.buscarPorId(id);
  }
}
