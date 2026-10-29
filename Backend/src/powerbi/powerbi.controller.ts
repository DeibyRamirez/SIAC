import { Body, Controller, Get, Param, Patch, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { PowerBiService } from './powerbi.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ActualizarInformePowerBiDto } from './dto/actualizar-informe-powerbi.dto';
import { ActualizarInsercionPowerBiDto } from './dto/actualizar-insercion-powerbi.dto';
import { TokenInsercionPowerBiService } from './token-insercion-powerbi.service';

const ROLES_INFORMES: RolUsuario[] = [RolUsuario.Administrador, RolUsuario.SuperAdmin];

@ApiTags('powerbi')
@ApiBearerAuth()
@Controller('powerbi')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PowerBiController {
  constructor(
    private readonly powerBiService: PowerBiService,
    private readonly tokenInsercion: TokenInsercionPowerBiService,
  ) {}

  @Get('insercion')
  @Roles(...ROLES_INFORMES)
  @ApiOperation({
    summary: 'Configuración de la inserción con token (sin secretos)',
  })
  obtenerInsercion() {
    return this.tokenInsercion.obtenerConfiguracion();
  }

  @Patch('insercion')
  @Roles(...ROLES_INFORMES)
  @ApiOperation({
    summary: 'Actualiza el interruptor y los identificadores del informe',
    description:
      'Solo Administrador y SuperAdmin. El cambio queda en el log de auditoría con el id del usuario. ' +
      'Encender el interruptor sin credenciales completas no activa el informe.',
  })
  actualizarInsercion(
    @Body() dto: ActualizarInsercionPowerBiDto,
    @Request() req: { user?: { id?: string } },
  ) {
    return this.tokenInsercion.actualizar(dto, req.user?.id);
  }

  @Post('probar-conexion')
  @Roles(...ROLES_INFORMES)
  @ApiOperation({
    summary: 'Prueba la entidad de servicio contra Azure y Power BI',
    description: 'No devuelve el token. Tiempo de espera de unos 10 segundos.',
  })
  probarConexion() {
    return this.tokenInsercion.probarConexion();
  }

  @Get('token-insercion')
  @Roles(...ROLES_INFORMES)
  @ApiOperation({
    summary: 'Token de inserción de solo lectura (máximo 60 minutos)',
    description:
      'Requiere sesión de Administrador o SuperAdmin y el interruptor encendido. ' +
      'Reutiliza la caché en memoria mientras al token le queden más de 5 minutos.',
  })
  obtenerTokenInsercion() {
    return this.tokenInsercion.obtenerTokenInsercion();
  }

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
