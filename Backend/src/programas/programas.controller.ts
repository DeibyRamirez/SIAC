import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { TAMANO_MAXIMO_RESOLUCION } from '../dominio/archivo-pdf';
import { CargarResolucionDto } from './dto/cargar-resolucion.dto';
import { ResolucionMenService } from './resolucion-men.service';
import { AuthGuard } from '@nestjs/passport';
import { RolUsuario } from '@prisma/client';
import { ProgramasService } from './programas.service';
import { AvanceProcesoSIACService } from './avance-proceso-siac.service';
import { PanelProgramasService } from './panel-programas.service';
import { ConsultaPanelProgramasDto } from './dto/consulta-panel-programas.dto';
import { CrearProgramaDto } from './dto/crear-programa.dto';
import {
  ActualizarEstadoProgramaDto,
  ActualizarProgramaDto,
} from './dto/actualizar-programa.dto';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { AlcancePrograma } from '../common/alcance/alcance-programa.decorator';
import { GuardAlcancePrograma } from '../common/alcance/guard-alcance-programa';
import { UsuarioAlcance } from '../common/alcance/servicio-alcance-programa';
import { VigenciaDemoService } from '../vigencias/vigencia-demo.service';
import { ApiContrato, ApiMultipart, PROPIEDAD_ARCHIVO_PDF } from '../openapi/api-contrato';
import { PaginaPanelDto } from '../openapi/modelos-respuesta';

@ApiTags('Programas')
@Controller('programas')
@UseGuards(AuthGuard('jwt'), RolesGuard, GuardAlcancePrograma)
export class ProgramasController {
  constructor(
    private readonly programasService: ProgramasService,
    private readonly avanceProcesoService: AvanceProcesoSIACService,
    private readonly panelProgramasService: PanelProgramasService,
    private readonly resolucionMen: ResolucionMenService,
    private readonly vigenciaDemo: VigenciaDemoService,
  ) {}

  @Get()
  @ApiContrato({
    resumen: 'Lista programas con semáforo, según el alcance del usuario',
    roles: ['autenticado'],
    descripcionRespuesta: 'Programas visibles para el rol.',
  })
  listarConSemaforo(@Request() req: { user: UsuarioAlcance }) {
    return this.programasService.listarConSemaforo(req.user);
  }

  @Get('avance-institucional')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Calcula el avance institucional',
    roles: ['Administrador', 'SuperAdmin'],
  })
  avanceInstitucional(@Request() req: { user: UsuarioAlcance }) {
    return this.programasService.calcularAvanceInstitucional(req.user);
  }

  @Get('panel')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Panel paginado de programas o de la institución',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: PaginaPanelDto,
    detalle:
      'page por defecto 1, limit por defecto 20 y máximo 100. ' +
      'Si se filtra por semaforo, la paginación se aplica después de calcular todas las filas.',
  })
  listarPanel(
    @Query() query: ConsultaPanelProgramasDto,
    @Request() req: { user: UsuarioAlcance },
  ) {
    return this.panelProgramasService.listarPanel(query, req.user);
  }

  @Post()
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Crea un programa',
    roles: ['Administrador', 'SuperAdmin'],
    creacion: true,
    tambien: [409],
  })
  crear(@Body() dto: CrearProgramaDto) {
    return this.programasService.crear(dto);
  }

  @Patch(':id/estado')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Activa o desactiva un programa',
    roles: ['Administrador', 'SuperAdmin'],
    tambien: [404],
    detalle: 'No borra el programa: un programa con evidencias se desactiva.',
  })
  actualizarEstado(@Param('id') id: string, @Body() dto: ActualizarEstadoProgramaDto) {
    return this.programasService.actualizarEstado(id, dto.activo);
  }

  @Patch(':id')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Actualiza los datos de un programa',
    roles: ['Administrador', 'SuperAdmin'],
    tambien: [404],
  })
  actualizar(@Param('id') id: string, @Body() dto: ActualizarProgramaDto) {
    return this.programasService.actualizar(id, dto);
  }

  /** Resolución MEN (solo PDF real): reemplaza «activar vigencia». 409 si hay documentos pendientes. */
  @Post(':id/iniciar-ciclo-renovacion')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Inicia un ciclo de renovación del programa',
    roles: ['Administrador', 'SuperAdmin'],
    creacion: true,
    tambien: [404, 409],
    detalle: '409 si hay documentos pendientes. La vigencia se activa con la resolución MEN, no con este alias histórico.',
  })
  iniciarCicloRenovacion(@Param('id') id: string) {
    return this.programasService.iniciarCicloRenovacion(id);
  }

  @Post(':id/resolucion')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Carga la resolución MEN del programa (PDF)',
    roles: ['Administrador', 'SuperAdmin'],
    creacion: true,
    tambien: [404, 409],
    detalle: '409 si hay documentos pendientes. El archivo es PDF real, máximo 20 MB.',
  })
  @ApiMultipart(
    {
      archivo: PROPIEDAD_ARCHIVO_PDF,
      numero: { type: 'string', maxLength: 60 },
      fechaResolucion: { type: 'string', example: '2026-03-15' },
    },
    ['archivo', 'numero', 'fechaResolucion'],
  )
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: TAMANO_MAXIMO_RESOLUCION } }))
  cargarResolucion(
    @Param('id') id: string,
    @Body() dto: CargarResolucionDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Req() req: { user: { id: string } },
  ) {
    return this.resolucionMen.cargarParaPrograma(id, dto, archivo, req.user);
  }

  @Get(':id/progreso')
  @AlcancePrograma({ parametroPrograma: 'id', modo: 'lectura' })
  @ApiContrato({
    resumen: 'Progreso del trámite del programa',
    roles: ['autenticado'],
    tambien: [404],
    detalle: '403 si el usuario no tiene el programa en su alcance.',
  })
  progreso(@Param('id') id: string) {
    return this.avanceProcesoService.calcularProgresoPrograma(id);
  }

  /** §0: semáforo de vigencia del programa (con escala demo si hay sesión activa). */
  @Get(':id/vigencia')
  @AlcancePrograma({ parametroPrograma: 'id', modo: 'lectura' })
  @ApiContrato({
    resumen: 'Semáforo de vigencia del programa',
    roles: ['autenticado'],
    tambien: [404],
    detalle: 'Usa la escala de la demo si hay una sesión de vigencia activa para el programa.',
  })
  vigencia(@Param('id') id: string) {
    return this.vigenciaDemo.consultarVigenciaEntidad('Programa', id);
  }

  @Get(':id')
  @AlcancePrograma({ parametroPrograma: 'id', modo: 'lectura' })
  @ApiContrato({
    resumen: 'Obtiene un programa',
    roles: ['autenticado'],
    tambien: [404],
  })
  obtener(@Param('id') id: string) {
    return this.programasService.obtenerPorId(id);
  }
}
