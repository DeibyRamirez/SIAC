import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolUsuario, EstadoEvidencia } from '@prisma/client';
import { BusquedaService } from './busqueda.service';

@Controller('busqueda')
@UseGuards(AuthGuard('jwt'))
export class BusquedaController {
  constructor(private readonly busquedaService: BusquedaService) {}

  @Get('unificada')
  buscarUnificada(
    @Query('q') consulta: string,
    @Query('limite') limite: string,
    @Request() req: { user: { rol: RolUsuario } },
  ) {
    const soloValidados = req.user.rol === RolUsuario.ParAcademico;
    return this.busquedaService.buscarUnificada(
      consulta,
      soloValidados,
      limite ? parseInt(limite, 10) : 8,
    );
  }

  @Get()
  buscar(
    @Query('q') busqueda: string,
    @Query('programaId') programaId: string,
    @Query('factor') factor: string,
    @Query('indicador') indicador: string,
    @Query('periodo') periodo: string,
    @Query('estado') estado: string,
    @Query('pagina') pagina: string,
    @Query('limite') limite: string,
    @Query('formato') formato: string,
    @Request() req: { user: { rol: RolUsuario } },
  ) {
    const soloValidados = req.user.rol === RolUsuario.ParAcademico;

    const formatoNormalizado =
      formato === 'pdf' || formato === 'xlsx' ? formato : undefined;

    return this.busquedaService.buscar(
      {
        busqueda,
        programaId,
        factor,
        indicador,
        periodo,
        estado: estado as EstadoEvidencia | undefined,
        formato: formatoNormalizado,
        pagina: pagina ? parseInt(pagina, 10) : 1,
        limite: limite ? parseInt(limite, 10) : 20,
      },
      soloValidados,
    );
  }
}
