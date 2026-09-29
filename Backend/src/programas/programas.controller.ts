import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolUsuario } from '@prisma/client';
import { ProgramasService } from './programas.service';
import { AvanceProcesoSIACService } from './avance-proceso-siac.service';
import { CrearProgramaDto } from './dto/crear-programa.dto';
import {
  ActualizarEstadoProgramaDto,
  ActualizarProgramaDto,
} from './dto/actualizar-programa.dto';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { AlcancePrograma } from '../common/alcance/alcance-programa.decorator';
import { GuardAlcancePrograma } from '../common/alcance/guard-alcance-programa';
import { UsuarioAlcance } from '../common/alcance/servicio-alcance-programa';

@Controller('programas')
@UseGuards(AuthGuard('jwt'), RolesGuard, GuardAlcancePrograma)
export class ProgramasController {
  constructor(
    private readonly programasService: ProgramasService,
    private readonly avanceProcesoService: AvanceProcesoSIACService,
  ) {}

  @Get()
  listarConSemaforo(@Request() req: { user: UsuarioAlcance }) {
    return this.programasService.listarConSemaforo(req.user);
  }

  @Post()
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  crear(@Body() dto: CrearProgramaDto) {
    return this.programasService.crear(dto);
  }

  @Patch(':id/estado')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  actualizarEstado(@Param('id') id: string, @Body() dto: ActualizarEstadoProgramaDto) {
    return this.programasService.actualizarEstado(id, dto.activo);
  }

  @Patch(':id')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarProgramaDto) {
    return this.programasService.actualizar(id, dto);
  }

  @Get(':id/progreso')
  @AlcancePrograma({ parametroPrograma: 'id', modo: 'lectura' })
  progreso(@Param('id') id: string) {
    return this.avanceProcesoService.calcularProgresoPrograma(id);
  }

  @Get(':id')
  @AlcancePrograma({ parametroPrograma: 'id', modo: 'lectura' })
  obtener(@Param('id') id: string) {
    return this.programasService.obtenerPorId(id);
  }
}
