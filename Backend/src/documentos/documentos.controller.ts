import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RolUsuario, EstadoEvidencia } from '@prisma/client';
import { DocumentosService } from './documentos.service';
import { CrearEvidenciaDto, ActualizarEvidenciaDto, FiltrosEvidenciaDto } from './dto/evidencia.dto';
import { DictaminarDto } from '../aprobacion/dto/dictaminar.dto';
import { Roles, RolesGuard } from '../common/guards/roles.guard';

@Controller('evidencias')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Post()
  @Roles(RolUsuario.Cargador)
  @UseInterceptors(FileInterceptor('archivo'))
  crear(
    @Body() dto: CrearEvidenciaDto,
    @UploadedFile() archivo: Express.Multer.File,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.crearConArchivo(dto, archivo, req.user);
  }

  @Get()
  listar(
    @Query() query: FiltrosEvidenciaDto,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.listar(req.user, {
      programaId: query.programaId,
      periodo: query.periodo,
      factor: query.factor,
      indicador: query.indicador,
      estado: query.estado as EstadoEvidencia | undefined,
      busqueda: query.busqueda,
      pagina: query.pagina ? parseInt(query.pagina, 10) : 1,
      limite: query.limite ? parseInt(query.limite, 10) : 20,
    });
  }

  @Get('mis-revisiones-revisor')
  @Roles(RolUsuario.Revisor, RolUsuario.Administrador)
  misRevisionesRevisor(
    @Query('pagina') pagina: string,
    @Query('limite') limite: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.listarMisRevisionesRevisor(
      req.user,
      pagina ? parseInt(pagina, 10) : 1,
      limite ? parseInt(limite, 10) : 20,
    );
  }

  @Get(':id/versiones')
  listarVersiones(
    @Param('id') id: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.listarVersiones(id, req.user);
  }

  @Get(':id/descargar')
  descargar(
    @Param('id') id: string,
    @Query('version') version: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    const numeroVersion = version ? parseInt(version, 10) : undefined;
    return this.documentosService.obtenerUrlDescarga(id, req.user, numeroVersion);
  }

  @Get(':id/contenido')
  async contenido(
    @Param('id') id: string,
    @Query('version') version: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    const numeroVersion = version ? parseInt(version, 10) : undefined;
    const archivo = await this.documentosService.obtenerContenidoArchivo(
      id,
      req.user,
      numeroVersion,
    );
    const mimeDocx =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return new StreamableFile(archivo.buffer, {
      type: mimeDocx,
      disposition: `inline; filename="${encodeURIComponent(archivo.nombreArchivo)}"`,
    });
  }

  @Get(':id/historial')
  historial(
    @Param('id') id: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.obtenerHistorial(id, req.user);
  }

  @Get(':id/evaluaciones-condicion')
  evaluacionesCondicion(
    @Param('id') id: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.obtenerEvaluacionesCondicion(id, req.user);
  }

  @Get(':id')
  obtener(
    @Param('id') id: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.obtenerPorId(id, req.user);
  }

  @Patch(':id')
  @Roles(RolUsuario.Cargador)
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarEvidenciaDto,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.actualizar(id, dto, req.user);
  }

  @Patch(':id/archivo')
  @Roles(RolUsuario.Cargador)
  @UseInterceptors(FileInterceptor('archivo'))
  reemplazarArchivo(
    @Param('id') id: string,
    @UploadedFile() archivo: Express.Multer.File,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.reemplazarArchivo(id, archivo, req.user);
  }

  @Delete(':id')
  @Roles(RolUsuario.Cargador)
  eliminar(
    @Param('id') id: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.eliminar(id, req.user);
  }

  @Post(':id/enviar-revision')
  @Roles(RolUsuario.Cargador)
  enviarRevision(
    @Param('id') id: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.enviarRevision(id, req.user);
  }

  @Post(':id/dictamen')
  @Roles(RolUsuario.Revisor)
  dictaminar(
    @Param('id') id: string,
    @Body() dto: DictaminarDto,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.dictaminar(id, dto, req.user);
  }
}

