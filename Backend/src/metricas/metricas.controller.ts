import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { PowerBiService } from '../powerbi/powerbi.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ApiContrato } from '../openapi/api-contrato';
import { EmbedTokenRespuestaDto } from '../openapi/modelos-respuesta';

@ApiTags('Métricas')
@Controller('metricas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RolUsuario.Administrador)
export class MetricasController {
  constructor(private readonly powerBiService: PowerBiService) {}

  @Get('token')
  @ApiQuery({ name: 'categoriaId', required: false, example: 'estudiantes' })
  @ApiContrato({
    resumen: 'Token de embebido Power BI (alias de /powerbi/embed-token)',
    roles: ['Administrador'],
    respuesta: EmbedTokenRespuestaDto,
    detalle: 'Misma implementación que GET /powerbi/embed-token. Solo la categoría estudiantes tiene informe propio.',
  })
  obtenerToken(@Query('categoriaId') categoriaId?: string) {
    return this.powerBiService.obtenerEmbedToken(categoriaId);
  }
}
