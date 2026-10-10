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

@Controller('programas')
@UseGuards(AuthGuard('jwt'), RolesGuard, GuardAlcancePrograma)
export class ProgramasController {
  constructor(
    private readonly programasService: ProgramasService,
    private readonly avanceProcesoService: AvanceProcesoSIACService,
    private readonly panelProgramasService: PanelProgramasService,
    private readonly resolucionMen: ResolucionMenService,
  ) {}

  @Get()
  listarConSemaforo(@Request() req: { user: UsuarioAlcance }) {
    return this.programasService.listarConSemaforo(req.user);
  }

  @Get('avance-institucional')
  @Roles(
    RolUsuario.Administrador,
    RolUsuario.SuperAdmin,
    RolUsuario.ParAcademico,
  )
  avanceInstitucional(@Request() req: { user: UsuarioAlcance }) {
    return this.programasService.calcularAvanceInstitucional(req.user);
  }

  @Get('panel')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  listarPanel(
    @Query() query: ConsultaPanelProgramasDto,
    @Request() req: { user: UsuarioAlcance },
  ) {
    return this.panelProgramasService.listarPanel(query, req.user);
  }

  @Post()
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  crear(@Body() dto: CrearProgramaDto) {
    return this.programasService.crear(dto);
  }

  @Patch(':id/estado')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  actualizarEstado(@Param('id') id: string, @Body() dto: ActualizarEstadoProgramaDto) {
    return this.programasService.actualizarEstado(id, dto.activo);
  }

  @Patch(':id')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarProgramaDto) {
    return this.programasService.actualizar(id, dto);
  }

  /** Resolución MEN (solo PDF real): reemplaza «activar vigencia». 409 si hay documentos pendientes. */
  @Post(':id/iniciar-ciclo-renovacion')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  iniciarCicloRenovacion(@Param('id') id: string) {
    return this.programasService.iniciarCicloRenovacion(id);
  }

  @Post(':id/resolucion')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
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
  progreso(@Param('id') id: string) {
    return this.avanceProcesoService.calcularProgresoPrograma(id);
  }

  @Get(':id')
  @AlcancePrograma({ parametroPrograma: 'id', modo: 'lectura' })
  obtener(@Param('id') id: string) {
    return this.programasService.obtenerPorId(id);
  }
}
