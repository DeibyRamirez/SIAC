import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CodigoDocumentoGuia, EstadoEvidencia } from '@prisma/client';
import { BusquedaService } from './busqueda.service';
import { UsuarioAlcance } from '../common/alcance/servicio-alcance-programa';

const CODIGOS_GUIA = Object.values(CodigoDocumentoGuia) as string[];

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
    @Query('q') busqueda: string,
    @Query('programaId') programaId: string,
    @Query('codigoGuia') codigoGuia: string,
    @Query('periodo') periodo: string,
    @Query('estado') estado: string,
    @Query('pagina') pagina: string,
    @Query('limite') limite: string,
    @Query('formato') formato: string,
    @Request() req: { user: UsuarioAlcance },
  ) {
    const formatoNormalizado =
      formato === 'pdf' || formato === 'xlsx' ? formato : undefined;
    if (codigoGuia && !CODIGOS_GUIA.includes(codigoGuia)) {
      throw new BadRequestException('codigoGuia debe ser G1, G2, G3 o G4.');
    }

    return this.busquedaService.buscar(
      {
        busqueda,
        programaId,
        codigoGuia: (codigoGuia || undefined) as CodigoDocumentoGuia | undefined,
        periodo,
        estado: estado as EstadoEvidencia | undefined,
        formato: formatoNormalizado,
        pagina: pagina ? parseInt(pagina, 10) : 1,
        limite: limite ? parseInt(limite, 10) : 20,
      },
      req.user,
    );
  }
}

