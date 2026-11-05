import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { BusquedaService } from './busqueda.service';
import { UsuarioAlcance } from '../common/alcance/servicio-alcance-programa';
import { ApiConsultaEvidencias, ApiContrato } from '../openapi/api-contrato';
import { BusquedaUnificadaDto, ResultadoBusquedaDto } from '../openapi/modelos-respuesta';

@ApiTags('Búsqueda')
@Controller('busqueda')
@UseGuards(AuthGuard('jwt'))
export class BusquedaController {
  constructor(private readonly busquedaService: BusquedaService) {}

  @Get('unificada')
  @ApiQuery({ name: 'q', required: true, description: 'Texto. Con menos de 2 caracteres la respuesta va vacía.' })
  @ApiQuery({ name: 'limite', required: false, description: 'Tope por colección. Por defecto 8. Sin máximo.' })
  @ApiContrato({
    resumen: 'Busca evidencias, plantillas y anexos a la vez',
    roles: ['autenticado'],
    respuesta: BusquedaUnificadaDto,
    detalle: 'El alcance de programa acota evidencias y anexos según el rol y los programas asignados.',
  })
  buscarUnificada(
    @Query('q') consulta: string,
    @Query('limite') limite: string,
    @Request() req: { user: UsuarioAlcance },
  ) {
    return this.busquedaService.buscarUnificada(
      consulta,
      req.user,
      limite ? parseInt(limite, 10) : 8,
    );
  }

  @Get()
  @ApiConsultaEvidencias()
  @ApiContrato({
    resumen: 'Busca evidencias con los mismos filtros que el listado',
    roles: ['autenticado'],
    respuesta: ResultadoBusquedaDto,
    detalle:
      'Consulta: mismos campos que el listado de evidencias. pagina por defecto 1 y limite por defecto 20, sin tope. La respuesta usa resultados, no datos. Los parámetros desconocidos se ignoran.',
  })
  buscar(
    @Query() query: Record<string, string>,
    @Request() req: { user: UsuarioAlcance },
  ) {
    return this.busquedaService.buscar(query, req.user);
  }
}
