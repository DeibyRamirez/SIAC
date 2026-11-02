import { Body, Controller, Get, Param, Patch, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { PowerBiService } from './powerbi.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ActualizarInformePowerBiDto } from './dto/actualizar-informe-powerbi.dto';
import { ActualizarInsercionPowerBiDto } from './dto/actualizar-insercion-powerbi.dto';
import { TokenInsercionPowerBiService } from './token-insercion-powerbi.service';
import { ApiContrato } from '../openapi/api-contrato';
import {
  ConfiguracionInsercionPowerBiDto,
  EmbedTokenRespuestaDto,
  InformePowerBiMetadatosDto,
  InformePowerBiUrlDto,
  ResultadoPruebaConexionPowerBiDto,
  TokenInsercionPowerBiDto,
} from '../openapi/modelos-respuesta';

const ROLES_INFORMES: RolUsuario[] = [RolUsuario.Administrador, RolUsuario.SuperAdmin];

@ApiTags('Power BI')
@Controller('powerbi')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PowerBiController {
  constructor(
    private readonly powerBiService: PowerBiService,
    private readonly tokenInsercion: TokenInsercionPowerBiService,
  ) {}

  @Get('insercion')
  @Roles(...ROLES_INFORMES)
  @ApiContrato({
    resumen: 'Configuración de la inserción con token (sin secretos)',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: ConfiguracionInsercionPowerBiDto,
    sinValidacion: true,
    detalle:
      'No devuelve POWERBI_CLIENT_SECRET. secretoConfigurado indica si la variable tiene valor. ' +
      'activo es verdadero solo con el interruptor encendido y la configuración completa.',
  })
  obtenerInsercion() {
    return this.tokenInsercion.obtenerConfiguracion();
  }

  @Patch('insercion')
  @Roles(...ROLES_INFORMES)
  @ApiContrato({
    resumen: 'Actualiza el interruptor y los identificadores del informe',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: ConfiguracionInsercionPowerBiDto,
    detalle:
      'El cambio queda en el log de auditoría con el id del usuario, sin secretos ni tokens. ' +
      'Encender el interruptor sin credenciales completas no activa el informe. ' +
      'Una cadena vacía borra workspaceId o reportId.',
  })
  actualizarInsercion(
    @Body() dto: ActualizarInsercionPowerBiDto,
    @Request() req: { user?: { id?: string } },
  ) {
    return this.tokenInsercion.actualizar(dto, req.user?.id);
  }

  @Post('probar-conexion')
  @Roles(...ROLES_INFORMES)
  @ApiContrato({
    resumen: 'Prueba la entidad de servicio contra Azure y Power BI',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: ResultadoPruebaConexionPowerBiDto,
    tambien: [503],
    detalle:
      'No devuelve el token. Tiempo de espera de unos 10 segundos. ' +
      '400 si la configuración está incompleta. 503 POWERBI_NO_DISPONIBLE si Azure o Power BI no responden.',
  })
  probarConexion() {
    return this.tokenInsercion.probarConexion();
  }

  @Get('token-insercion')
  @Roles(...ROLES_INFORMES)
  @ApiContrato({
    resumen: 'Token de inserción de solo lectura (máximo 60 minutos)',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: TokenInsercionPowerBiDto,
    tambien: [503],
    detalle:
      'Requiere el interruptor encendido. Reutiliza la caché en memoria mientras al token le queden más de 5 minutos. ' +
      '403 si la inserción está apagada. 400 si la configuración está incompleta. ' +
      'La respuesta incluye el token de inserción; el secreto de Azure no sale del servidor.',
  })
  obtenerTokenInsercion() {
    return this.tokenInsercion.obtenerTokenInsercion();
  }

  @Get('informes')
  @Roles(...ROLES_INFORMES)
  @ApiContrato({
    resumen: 'Lista el catálogo de informes y si cada URL pública está configurada',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: InformePowerBiMetadatosDto,
    lista: true,
    detalle:
      'No devuelve la URL en claro, solo urlHash. El catálogo HTTP tiene ocho categorías. ' +
      'El contrato de datos de lectura (vista y rol) cubre seis dominios; ver docs/contrato-api/README.md.',
  })
  listarInformes() {
    return this.powerBiService.listarInformes();
  }

  @Get('informes/:categoriaId/url')
  @Roles(...ROLES_INFORMES)
  @ApiContrato({
    resumen: 'Devuelve la URL pública de una categoría',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: InformePowerBiUrlDto,
    tambien: [404],
    detalle: 'categoriaId debe existir en el catálogo. 404 si no hay URL activa.',
  })
  obtenerUrlPublica(@Param('categoriaId') categoriaId: string) {
    return this.powerBiService.obtenerUrlPublicaCategoria(categoriaId);
  }

  @Put('informes/:categoriaId')
  @Roles(...ROLES_INFORMES)
  @ApiContrato({
    resumen: 'Guarda la URL de «Publicar en la web»',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: InformePowerBiMetadatosDto,
    detalle: 'Solo acepta https://app.powerbi.com/view?r=... La respuesta no repite la URL, solo el hash.',
  })
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
  @ApiContrato({
    resumen: 'Token o URL de embebido',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: EmbedTokenRespuestaDto,
    detalle:
      'Sin Azure devuelve fallback=true y embedToken null. Solo estudiantes tiene rama propia. ' +
      'No consulta v_powerbi_puntajes.',
  })
  obtenerEmbedToken(@Query('categoriaId') categoriaId?: string) {
    return this.powerBiService.obtenerEmbedToken(categoriaId);
  }
}
