import { Body, Controller, Get, Param, Put, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { PowerBiService } from './powerbi.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ActualizarInformePowerBiDto } from './dto/actualizar-informe-powerbi.dto';
import { ApiContrato } from '../openapi/api-contrato';
import {
  EmbedTokenRespuestaDto,
  InformePowerBiMetadatosDto,
  InformePowerBiUrlDto,
} from '../openapi/modelos-respuesta';

const ROLES_INFORMES: RolUsuario[] = [RolUsuario.Administrador, RolUsuario.SuperAdmin];

@ApiTags('Power BI')
@Controller('powerbi')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PowerBiController {
  constructor(private readonly powerBiService: PowerBiService) {}

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
