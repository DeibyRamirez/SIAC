import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolUsuario } from '@prisma/client';
import { ProgramasService } from './programas.service';
import { ProgramaRepositorio } from './programas.service';
import { CrearProgramaDto } from './dto/crear-programa.dto';
import { Roles, RolesGuard } from '../common/guards/roles.guard';

@Controller('programas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProgramasController {
  constructor(
    private readonly programasService: ProgramasService,
    private readonly programaRepo: ProgramaRepositorio,
  ) {}

  @Get()
  listarConSemaforo() {
    return this.programasService.listarConSemaforo();
  }

  @Post()
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  crear(@Body() dto: CrearProgramaDto) {
    return this.programasService.crear(dto);
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.programaRepo.buscarPorId(id);
  }
}
