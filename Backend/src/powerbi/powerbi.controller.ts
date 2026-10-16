import { Body, Controller, Get, Param, Put, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { PowerBiService } from './powerbi.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ActualizarInformePowerBiDto } from './dto/actualizar-informe-powerbi.dto';

const ROLES_INFORMES: RolUsuario[] = [RolUsuario.Administrador, RolUsuario.SuperAdmin];

@ApiTags('powerbi')
@ApiBearerAuth()
@Controller('powerbi')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PowerBiController {
  constructor(private readonly powerBiService: PowerBiService) {}

  @Get('informes')
  @Roles(...ROLES_INFORMES)
  listarInformes() {
    return this.powerBiService.listarInformes();
  }

  @Get('informes/:categoriaId/url')
  @Roles(...ROLES_INFORMES)
  obtenerUrlPublica(@Param('categoriaId') categoriaId: string) {
    return this.powerBiService.obtenerUrlPublicaCategoria(categoriaId);
  }

  @Put('informes/:categoriaId')
  @Roles(...ROLES_INFORMES)
  actualizarUrl(
    @Param('categoriaId') categoriaId: string,
    @Body() dto: ActualizarInformePowerBiDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.powerBiService.guardarUrlPublica(categoriaId, dto.urlPublica, req.user.id);
  }

  @Get('embed-token')
  @Roles(...ROLES_INFORMES)
  @ApiQuery({ name: 'categoriaId', required: false, example: 'estudiantes' })
  obtenerEmbedToken(@Query('categoriaId') categoriaId?: string) {
    return this.powerBiService.obtenerEmbedToken(categoriaId);
  }
}
