import { Body, Controller, Get, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TAMANO_MAXIMO_RESOLUCION } from '../dominio/archivo-pdf';
import { CargarResolucionDto } from './dto/cargar-resolucion.dto';
import { ResolucionMenService } from './resolucion-men.service';
import { AuthGuard } from '@nestjs/passport';
import { RolUsuario } from '@prisma/client';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { InstitucionService } from './institucion.service';
import { ActualizarInstitucionDto } from './dto/actualizar-institucion.dto';

@Controller('institucion')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
export class InstitucionController {
  constructor(
    private readonly institucionService: InstitucionService,
    private readonly resolucionMen: ResolucionMenService,
  ) {}

  @Get()
  obtener() {
    return this.institucionService.obtener();
  }

  @Get('progreso')
  progreso() {
    return this.institucionService.obtenerProgreso();
  }

  @Get('resumen')
  @Roles(
    RolUsuario.Administrador,
    RolUsuario.SuperAdmin,
    RolUsuario.Cargador,
    RolUsuario.Revisor,
  )
  obtenerResumen() {
    return this.institucionService.obtenerResumen();
  }

  @Patch()
  actualizar(@Body() dto: ActualizarInstitucionDto) {
    return this.institucionService.actualizar(dto);
  }

  /** Resolución MEN de la institución (solo PDF real). 409 si hay documentos pendientes. */
  @Post('resolucion')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: TAMANO_MAXIMO_RESOLUCION } }))
  cargarResolucion(
    @Body() dto: CargarResolucionDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Req() req: { user: { id: string } },
  ) {
    return this.resolucionMen.cargarParaInstitucion(dto, archivo, req.user);
  }
}
