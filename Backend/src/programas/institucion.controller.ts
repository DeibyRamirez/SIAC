import { Body, Controller, Get, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { TAMANO_MAXIMO_RESOLUCION } from '../dominio/archivo-pdf';
import { CargarResolucionDto } from './dto/cargar-resolucion.dto';
import { ResolucionMenService } from './resolucion-men.service';
import { AuthGuard } from '@nestjs/passport';
import { RolUsuario } from '@prisma/client';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { InstitucionService } from './institucion.service';
import { ActualizarInstitucionDto } from './dto/actualizar-institucion.dto';
import { ApiContrato, ApiMultipart, PROPIEDAD_ARCHIVO_PDF } from '../openapi/api-contrato';

@ApiTags('Institución')
@Controller('institucion')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
export class InstitucionController {
  constructor(
    private readonly institucionService: InstitucionService,
    private readonly resolucionMen: ResolucionMenService,
  ) {}

  @Get()
  @ApiContrato({
    resumen: 'Datos de la institución',
    roles: ['Administrador', 'SuperAdmin'],
    tambien: [404],
    detalle: 'El @Roles de la clase limita este método. Los GET progreso y resumen lo amplían.',
  })
  obtener() {
    return this.institucionService.obtener();
  }

  @Get('progreso')
  @ApiContrato({
    resumen: 'Progreso del trámite institucional',
    roles: ['Administrador', 'SuperAdmin', 'Cargador', 'Revisor'],
    tambien: [404],
    detalle: '403 si quien consulta no es responsable del proceso institucional.',
  })
  @Roles(
    RolUsuario.Administrador,
    RolUsuario.SuperAdmin,
    RolUsuario.Cargador,
    RolUsuario.Revisor,
  )
  progreso(@Req() req: { user: { id: string; rol: RolUsuario } }) {
    return this.institucionService.obtenerProgreso(req.user);
  }

  @Get('resumen')
  @ApiContrato({
    resumen: 'Resumen institucional',
    roles: ['Administrador', 'SuperAdmin', 'Cargador', 'Revisor'],
    tambien: [404],
  })
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
  @ApiContrato({
    resumen: 'Actualiza el trámite activo de la institución',
    roles: ['Administrador', 'SuperAdmin'],
    tambien: [404],
  })
  actualizar(@Body() dto: ActualizarInstitucionDto) {
    return this.institucionService.actualizar(dto);
  }

  /** Resolución MEN de la institución (solo PDF real). 409 si hay documentos pendientes. */
  @Post('resolucion')
  @ApiContrato({
    resumen: 'Carga la resolución MEN de la institución (PDF)',
    roles: ['Administrador', 'SuperAdmin'],
    creacion: true,
    tambien: [409],
    detalle: '409 si hay documentos pendientes. PDF real, máximo 20 MB.',
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
    @Body() dto: CargarResolucionDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Req() req: { user: { id: string } },
  ) {
    return this.resolucionMen.cargarParaInstitucion(dto, archivo, req.user);
  }
}
