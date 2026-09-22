import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolUsuario } from '@prisma/client';
import { PowerBiService } from './powerbi.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';

@Controller('powerbi')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RolUsuario.Administrador)
export class PowerBiController {
  constructor(private readonly powerBiService: PowerBiService) {}

  @Get('embed-token')
  obtenerEmbedToken() {
    return this.powerBiService.obtenerEmbedToken();
  }
}
