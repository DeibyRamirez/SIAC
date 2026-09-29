import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolUsuario } from '@prisma/client';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { AvanceProcesoSIACService } from '../programas/avance-proceso-siac.service';
import { ActualizarInstitucionDto } from './dto/actualizar-institucion.dto';
import { InstitucionesService } from './instituciones.service';

/**
 * HU-010. La institución no depende de UsuarioPrograma: sus datos básicos los lee cualquier
 * usuario autenticado (el Cargador los necesita para cargar G3/G4) y el avance del trámite
 * institucional lo consultan los roles de seguimiento (no el Cargador).
 */
@Controller('instituciones')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class InstitucionesController {
  constructor(
    private readonly institucionesService: InstitucionesService,
    private readonly avanceProceso: AvanceProcesoSIACService,
  ) {}

  @Get()
  listar() {
    return this.institucionesService.listar();
  }

  @Get('principal')
  obtenerPrincipal() {
    return this.institucionesService.obtenerPrincipal();
  }

  @Get(':id/progreso')
  @Roles(
    RolUsuario.Administrador,
    RolUsuario.SuperAdmin,
    RolUsuario.Revisor,
    RolUsuario.ParAcademico,
  )
  async progreso(@Param('id') id: string) {
    await this.institucionesService.obtenerPorId(id);
    return this.avanceProceso.calcularProgresoInstitucion(id);
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.institucionesService.obtenerPorId(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarInstitucionDto) {
    return this.institucionesService.actualizar(id, dto);
  }
}
