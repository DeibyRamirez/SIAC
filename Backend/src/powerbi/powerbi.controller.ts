import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { PowerBiService } from './powerbi.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';

const ROLES_EMBED: RolUsuario[] = [RolUsuario.Administrador, RolUsuario.ParAcademico];

@ApiTags('powerbi')
@ApiBearerAuth()
@Controller('powerbi')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(...ROLES_EMBED)
export class PowerBiController {
  constructor(private readonly powerBiService: PowerBiService) {}

  @Get('embed-token')
  @ApiQuery({ name: 'categoriaId', required: false, example: 'estudiantes' })
  obtenerEmbedToken(@Query('categoriaId') categoriaId?: string) {
    return this.powerBiService.obtenerEmbedToken(categoriaId);
  }
}
