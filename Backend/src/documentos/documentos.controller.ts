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
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { DocumentosService } from './documentos.service';
import { CrearEvidenciaDto, ActualizarEvidenciaDto, FiltrosEvidenciaDto } from './dto/evidencia.dto';
import { DictaminarDto } from '../aprobacion/dto/dictaminar.dto';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { AlcancePrograma } from '../common/alcance/alcance-programa.decorator';
import { GuardAlcancePrograma } from '../common/alcance/guard-alcance-programa';
import {
  ApiContrato,
  ApiMultipart,
  MIME_DOCX_SIAC,
  PROPIEDAD_ARCHIVO_DOCX,
} from '../openapi/api-contrato';
import { ConteosEvidenciaDto, PaginaDto, UrlFirmadaDto } from '../openapi/modelos-respuesta';

const CAMPOS_EVIDENCIA = {
  nombre: { type: 'string' },
  programaId: { type: 'string', description: 'Obligatorio en G1/G2. Omitir en G3/G4.' },
  periodo: { type: 'string', example: '2026-1' },
  responsable: { type: 'string' },
  documentoRequeridoId: { type: 'string' },
  requiereChecklistMaestro: { type: 'string' },
  codigoGuia: { type: 'string', enum: ['G1', 'G2', 'G3', 'G4'] },
};

@ApiTags('Evidencias')
@Controller('evidencias')
@UseGuards(AuthGuard('jwt'), RolesGuard, GuardAlcancePrograma)
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Post()
  @Roles(RolUsuario.Cargador)
  @AlcancePrograma({ campoCuerpo: 'programaId', modo: 'escritura' })
  @ApiContrato({
    resumen: 'Crea una evidencia con archivo',
    roles: ['Cargador'],
    creacion: true,
    detalle: 'Documento .docx de hasta 20 MB. La resolución MEN es la excepción PDF y no pasa por este flujo. 403 si el programa no está asignado.',
  })
  @ApiMultipart({ archivo: PROPIEDAD_ARCHIVO_DOCX, ...CAMPOS_EVIDENCIA }, ['archivo', 'nombre', 'periodo'])
  @UseInterceptors(FileInterceptor('archivo'))
  crear(
    @Body() dto: CrearEvidenciaDto,
    @UploadedFile() archivo: Express.Multer.File,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.crearConArchivo(dto, archivo, req.user);
  }

  @Get()
  @AlcancePrograma({ campoConsulta: 'programaId', modo: 'lectura' })
  @ApiContrato({
    resumen: 'Lista evidencias visibles para el usuario',
    roles: ['autenticado'],
    respuesta: PaginaDto,
    detalle:
      'pagina por defecto 1 y limite por defecto 20, ambos enteros en texto y sin tope máximo. ' +
      'El alcance oculta borradores ajenos y programas no asignados.',
  })
  listar(
    @Query() query: FiltrosEvidenciaDto,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.listar(req.user, query);
  }

  /** Periodos con documentos visibles (la RLS acota por rol y programa). */
  @Get('periodos')
  @ApiContrato({
    resumen: 'Lista periodos que tienen documentos visibles',
    roles: ['autenticado'],
    esquema: { type: 'array', items: { type: 'string', example: '2026-1' } },
    detalle: 'La RLS acota por rol y programa.',
  })
  listarPeriodos() {
    return this.documentosService.listarPeriodosConDatos();
  }

  @Get('conteos')
  @ApiContrato({
    resumen: 'Cuenta evidencias por estado dentro del alcance',
    roles: ['autenticado'],
    respuesta: ConteosEvidenciaDto,
  })
  conteos(@Request() req: { user: { id: string; rol: RolUsuario } }) {
    return this.documentosService.conteosPorEstado(req.user);
  }

  @Get('mis-revisiones-revisor')
  @Roles(RolUsuario.Revisor)
  @ApiQuery({ name: 'pagina', required: false, example: '1' })
  @ApiQuery({ name: 'limite', required: false, example: '20' })
  @ApiContrato({
    resumen: 'Envíos a revisión del revisor, paginados',
    roles: ['Revisor'],
    respuesta: PaginaDto,
    detalle: 'pagina por defecto 1 y limite por defecto 20. La página se corta en memoria después de armar las filas.',
  })
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
  @AlcancePrograma({ parametroEvidencia: 'id', modo: 'lectura' })
  @ApiContrato({
    resumen: 'Lista las versiones del documento',
    roles: ['autenticado'],
    tambien: [404],
  })
  listarVersiones(
    @Param('id') id: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.listarVersiones(id, req.user);
  }

  @Get(':id/versiones/:a/diff/:b')
  @ApiContrato({
    resumen: 'Compara dos versiones del documento',
    roles: ['autenticado'],
    tambien: [404],
    detalle: 'a y b son números de versión.',
  })
  compararVersiones(
    @Param('id') id: string,
    @Param('a') a: string,
    @Param('b') b: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.compararVersiones(
      id,
      parseInt(a, 10),
      parseInt(b, 10),
      req.user,
    );
  }

  @Get(':id/descargar')
  @AlcancePrograma({ parametroEvidencia: 'id', modo: 'lectura' })
  @ApiQuery({ name: 'version', required: false, description: 'Número de versión. Sin él, el archivo vigente.' })
  @ApiContrato({
    resumen: 'URL firmada del archivo',
    roles: ['autenticado'],
    respuesta: UrlFirmadaDto,
    tambien: [404],
  })
  descargar(
    @Param('id') id: string,
    @Query('version') version: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    const numeroVersion = version ? parseInt(version, 10) : undefined;
    return this.documentosService.obtenerUrlDescarga(id, req.user, numeroVersion);
  }

  @Get(':id/contenido')
  @AlcancePrograma({ parametroEvidencia: 'id', modo: 'lectura' })
  @ApiQuery({ name: 'version', required: false })
  @ApiContrato({
    resumen: 'Contenido binario del documento',
    roles: ['autenticado'],
    binario: MIME_DOCX_SIAC,
    tambien: [404],
  })
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
  @AlcancePrograma({ parametroEvidencia: 'id', modo: 'lectura' })
  @ApiContrato({
    resumen: 'Historial de estados de la evidencia',
    roles: ['autenticado'],
    tambien: [404],
  })
  historial(
    @Param('id') id: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.obtenerHistorial(id, req.user);
  }

  @Get(':id/comentarios')
  @ApiQuery({ name: 'version', required: false })
  @ApiContrato({
    resumen: 'Comentarios de la evidencia',
    roles: ['autenticado'],
    tambien: [404],
  })
  comentarios(
    @Param('id') id: string,
    @Query('version') version: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    const numeroVersion = version ? parseInt(version, 10) : undefined;
    return this.documentosService.listarComentarios(id, req.user, numeroVersion);
  }

  @Get(':id/evaluaciones-condicion')
  @AlcancePrograma({ parametroEvidencia: 'id', modo: 'lectura' })
  @ApiQuery({ name: 'numeroRevision', required: false })
  @ApiContrato({
    resumen: 'Checklist G1 de una revisión',
    roles: ['autenticado'],
    tambien: [404],
    detalle: 'Sin numeroRevision devuelve la última. G1 tiene 9 condiciones.',
  })
  evaluacionesCondicion(
    @Param('id') id: string,
    @Query('numeroRevision') numeroRevision: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    const revision = numeroRevision ? parseInt(numeroRevision, 10) : undefined;
    return this.documentosService.obtenerEvaluacionesCondicion(id, req.user, revision);
  }

  @Get(':id/evaluaciones-condicion-institucional')
  @AlcancePrograma({ parametroEvidencia: 'id', modo: 'lectura' })
  @ApiQuery({ name: 'numeroRevision', required: false })
  @ApiContrato({
    resumen: 'Checklist G3 de una revisión',
    roles: ['autenticado'],
    tambien: [404],
    detalle: 'G3 tiene 6 condiciones.',
  })
  evaluacionesCondicionInstitucional(
    @Param('id') id: string,
    @Query('numeroRevision') numeroRevision: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    const revision = numeroRevision ? parseInt(numeroRevision, 10) : undefined;
    return this.documentosService.obtenerEvaluacionesCondicionInstitucional(
      id,
      req.user,
      revision,
    );
  }

  @Get(':id')
  @AlcancePrograma({ parametroEvidencia: 'id', modo: 'lectura' })
  @ApiContrato({
    resumen: 'Obtiene una evidencia',
    roles: ['autenticado'],
    tambien: [404],
    detalle:
      'Incluye programa, autor (id, nombre, correo) y las evaluaciones de condición. ' +
      '403 si el borrador no es del autor o el programa no está asignado.',
  })
  obtener(
    @Param('id') id: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.obtenerPorId(id, req.user);
  }

  @Patch(':id')
  @Roles(RolUsuario.Cargador)
  @AlcancePrograma({ parametroEvidencia: 'id', modo: 'escritura' })
  @ApiContrato({
    resumen: 'Actualiza metadatos de un borrador propio',
    roles: ['Cargador'],
    tambien: [404],
    detalle: 'No modifica una evidencia validada ni la de otro autor.',
  })
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarEvidenciaDto,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.actualizar(id, dto, req.user);
  }

  @Patch(':id/archivo')
  @Roles(RolUsuario.Cargador)
  @AlcancePrograma({ parametroEvidencia: 'id', modo: 'escritura' })
  @ApiContrato({
    resumen: 'Reemplaza el archivo de un borrador propio',
    roles: ['Cargador'],
    tambien: [404],
  })
  @ApiMultipart({ archivo: PROPIEDAD_ARCHIVO_DOCX }, ['archivo'])
  @UseInterceptors(FileInterceptor('archivo'))
  reemplazarArchivo(
    @Param('id') id: string,
    @UploadedFile() archivo: Express.Multer.File,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.reemplazarArchivo(id, archivo, req.user);
  }

  /** Usabilidad: Revisor/Administrador reemplazan el documento aunque esté validado (versionado). */
  @Post(':id/reemplazo-documento')
  @Roles(RolUsuario.Revisor, RolUsuario.Administrador)
  @AlcancePrograma({ parametroEvidencia: 'id', modo: 'gestion' })
  @ApiContrato({
    resumen: 'Reemplaza el documento aunque esté validado',
    roles: ['Revisor', 'Administrador'],
    creacion: true,
    tambien: [404],
    detalle: 'Crea una versión. El borrador lo sigue gestionando su autor.',
  })
  @ApiMultipart({ archivo: PROPIEDAD_ARCHIVO_DOCX }, ['archivo'])
  @UseInterceptors(FileInterceptor('archivo'))
  reemplazarDocumentoGestion(
    @Param('id') id: string,
    @UploadedFile() archivo: Express.Multer.File,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.reemplazarDocumentoGestion(id, archivo, req.user);
  }

  @Delete(':id')
  @Roles(RolUsuario.Cargador)
  @AlcancePrograma({ parametroEvidencia: 'id', modo: 'escritura' })
  @ApiContrato({
    resumen: 'Elimina un borrador propio',
    roles: ['Cargador'],
    tambien: [404],
  })
  eliminar(
    @Param('id') id: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.eliminar(id, req.user);
  }

  @Post(':id/enviar-revision')
  @Roles(RolUsuario.Cargador)
  @AlcancePrograma({ parametroEvidencia: 'id', modo: 'escritura' })
  @ApiContrato({
    resumen: 'Envía la evidencia a revisión',
    roles: ['Cargador'],
    creacion: true,
    tambien: [404, 409],
    detalle: 'Pasa de Borrador a EnRevision y deja historial en la misma transacción.',
  })
  enviarRevision(
    @Param('id') id: string,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.enviarRevision(id, req.user);
  }

  @Post(':id/dictamen')
  @Roles(RolUsuario.Revisor)
  @AlcancePrograma({ parametroEvidencia: 'id', modo: 'escritura' })
  @ApiContrato({
    resumen: 'Dictamina una evidencia en revisión',
    roles: ['Revisor'],
    creacion: true,
    tambien: [404],
    detalle:
      'Solo evidencias EnRevision. G1 exige las 9 condiciones y G3 las 6. ' +
      'Una condición con cumple=false exige observación (máximo 600 caracteres). ' +
      'El estado explícito es Validado o Rechazado.',
  })
  dictaminar(
    @Param('id') id: string,
    @Body() dto: DictaminarDto,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.dictaminar(id, dto, req.user);
  }
}

