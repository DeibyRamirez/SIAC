import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AlmacenamientoService } from './almacenamiento.service';

@Controller('almacen-local')
@UseGuards(AuthGuard('jwt'))
export class AlmacenamientoLocalController {
  constructor(private readonly almacenamiento: AlmacenamientoService) {}

  @Get('*path')
  servirArchivo(@Req() req: Request, @Res() res: Response) {
    const estado = this.almacenamiento.obtenerEstadoConexion();
    if (estado.modo !== 'local') {
      throw new NotFoundException('El almacenamiento local no está activo.');
    }

    const prefijo = '/api/v1/almacen-local/';
    const rutaCompleta = req.originalUrl.split('?')[0];
    if (!rutaCompleta.startsWith(prefijo)) {
      throw new NotFoundException('Ruta de archivo no válida.');
    }

    const clave = decodeURIComponent(rutaCompleta.slice(prefijo.length));
    if (!clave || clave.includes('..')) {
      throw new ForbiddenException('Clave de archivo no permitida.');
    }

    const tipo = this.almacenamiento.resolverTipoBucketDesdeClave(clave);
    const stream = this.almacenamiento.crearStreamDescarga(clave);
    const nombre = clave.split('/').pop() ?? 'archivo';
    res.setHeader('Content-Disposition', `inline; filename="${nombre}"`);
    if (tipo === 'plantillas' || clave.endsWith('.docx')) {
      res.type(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
    } else if (clave.endsWith('.pdf')) {
      res.type('application/pdf');
    }
    stream.pipe(res);
  }
}
