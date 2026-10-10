import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BusquedaService } from './busqueda.service';
import { UsuarioAlcance } from '../common/alcance/servicio-alcance-programa';

@Controller('busqueda')
@UseGuards(AuthGuard('jwt'))
export class BusquedaController {
  constructor(private readonly busquedaService: BusquedaService) {}

  @Get('unificada')
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
  buscar(
    @Query() query: Record<string, string>,
    @Request() req: { user: UsuarioAlcance },
  ) {
    return this.busquedaService.buscar(query, req.user);
  }
}
