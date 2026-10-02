import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolUsuario } from '@prisma/client';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { InstitucionService } from './institucion.service';
import { ActualizarInstitucionDto } from './dto/actualizar-institucion.dto';

@Controller('institucion')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
export class InstitucionController {
  constructor(private readonly institucionService: InstitucionService) {}

  @Get()
  obtener() {
    return this.institucionService.obtener();
  }

  @Get('progreso')
  progreso() {
    return this.institucionService.obtenerProgreso();
  }

  @Patch()
  actualizar(@Body() dto: ActualizarInstitucionDto) {
    return this.institucionService.actualizar(dto);
  }

  @Post('activar-vigencia')
  activarVigencia() {
    return this.institucionService.activarVigencia();
  }
}
