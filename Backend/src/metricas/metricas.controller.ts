import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolUsuario } from '@prisma/client';
import { PowerBiService } from '../powerbi/powerbi.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';

@Controller('metricas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RolUsuario.Revisor, RolUsuario.Administrador)
export class MetricasController {
  constructor(private readonly powerBiService: PowerBiService) {}

  @Get('token')
  obtenerToken(@Query('categoriaId') categoriaId?: string) {
    return this.powerBiService.obtenerEmbedToken(categoriaId);
  }
}
