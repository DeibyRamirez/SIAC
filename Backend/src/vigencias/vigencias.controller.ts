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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { VigenciasService } from './vigencias.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ActualizarAnexoDto, CrearAnexoConArchivoDto } from './dto/anexo-vigencia.dto';
import { PaquetesRegistroVigenciaService } from './paquetes-registro-vigencia.service';
import { VigenciaDemoService } from './vigencia-demo.service';
import { DetenerDemoVigenciaDto, IniciarDemoVigenciaDto } from './dto/vigencia-demo.dto';
import type { AlcancePaqueteVigencia } from './paquetes-registro-vigencia.service';
import { EvaluadorVigenciaRegistroService } from './evaluador-vigencia-registro.service';
import { ApiContrato, ApiMultipart, PROPIEDAD_ARCHIVO_DOCX } from '../openapi/api-contrato';
import { DemoVigenciaDetenidaDto, DemoVigenciaIniciadaDto, UrlFirmadaDto } from '../openapi/modelos-respuesta';

@ApiTags('Vigencias')
@Controller('vigencias')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class VigenciasController {
  constructor(
    private readonly vigenciasService: VigenciasService,
    private readonly paquetesRegistro: PaquetesRegistroVigenciaService,
    private readonly vigenciaDemo: VigenciaDemoService,
    private readonly evaluadorVigenciaRegistro: EvaluadorVigenciaRegistroService,
  ) {}

  @Get()
  @ApiQuery({ name: 'programaId', required: false })
  @ApiContrato({
    resumen: 'Lista anexos de vigencia',
    roles: ['autenticado'],
    detalle: 'Alias de GET /vigencias/anexos.',
  })
  listar(@Query('programaId') programaId?: string) {
    return this.vigenciasService.listarAnexos(programaId);
  }

  @Get('anexos')
  @ApiQuery({ name: 'programaId', required: false })
  @ApiContrato({ resumen: 'Lista anexos de vigencia', roles: ['autenticado'] })
  listarAnexos(@Query('programaId') programaId?: string) {
    return this.vigenciasService.listarAnexos(programaId);
  }

  @Get('paquetes-registro')
  @ApiQuery({ name: 'programaId', required: false })
  @ApiContrato({ resumen: 'Lista paquetes de registro calificado', roles: ['autenticado'] })
  listarPaquetesRegistro(@Query('programaId') programaId?: string) {
    return this.paquetesRegistro.listar(programaId);
  }

  @Get('demo/estado')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiQuery({ name: 'entidadId', required: true })
  @ApiQuery({ name: 'alcance', required: true, enum: ['Programa', 'Institucion'] })
  @ApiContrato({
    resumen: 'Estado de la demo acelerada de vigencia',
    roles: ['Administrador', 'SuperAdmin'],
    detalle: '400 si falta entidadId o el alcance no es Programa o Institucion.',
  })
  estadoDemo(
    @Query('entidadId') entidadId: string,
    @Query('alcance') alcance: string,
  ) {
    if (!entidadId || (alcance !== 'Programa' && alcance !== 'Institucion')) {
      throw new BadRequestException('Indique entidadId y alcance Programa o Institucion.');
    }
    return this.vigenciaDemo.consultarEstado(alcance as AlcancePaqueteVigencia, entidadId);
  }

  @Post('demo/iniciar')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Inicia la demo acelerada de vigencia',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: DemoVigenciaIniciadaDto,
    creacion: true,
    detalle: 'Tras abrir la sesión evalúa solo las entidades en demo.',
  })
  async iniciarDemo(@Body() dto: IniciarDemoVigenciaDto) {
    const sesion = await this.vigenciaDemo.iniciar(dto.alcance, dto.entidadId);
    await this.evaluadorVigenciaRegistro.evaluarTodasLasEntidades(new Date(), { soloSesionesDemo: true });
    return {
      inicioAtMs: sesion.inicioAtMs,
      duracionSeg: this.vigenciaDemo.duracionPruebaSeg(),
      intervaloSeg: this.vigenciaDemo.intervaloPruebaSeg(),
    };
  }

  @Post('demo/detener')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Detiene la demo de vigencia',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: DemoVigenciaDetenidaDto,
    creacion: true,
  })
  detenerDemo(@Body() dto: DetenerDemoVigenciaDto) {
    this.vigenciaDemo.detener(dto.alcance, dto.entidadId);
    return { detenida: true };
  }

  @Get(':id/descargar')
  @ApiContrato({
    resumen: 'URL firmada del anexo',
    roles: ['autenticado'],
    respuesta: UrlFirmadaDto,
    tambien: [404],
  })
  descargar(@Param('id') id: string) {
    return this.vigenciasService.obtenerUrlDescarga(id);
  }

  @Post('con-archivo')
  @Roles(RolUsuario.Administrador)
  @ApiContrato({
    resumen: 'Crea un anexo de vigencia con archivo',
    roles: ['Administrador'],
    creacion: true,
  })
  @ApiMultipart(
    {
      archivo: PROPIEDAD_ARCHIVO_DOCX,
      titulo: { type: 'string' },
      programaId: { type: 'string' },
      categoria: { type: 'string', enum: ['Infraestructura', 'Permiso', 'Convenio', 'Otro'] },
      evidenciaId: { type: 'string' },
      fechaVencimiento: { type: 'string', example: '2027-01-31' },
      fechaExpedicion: { type: 'string', example: '2026-01-31' },
      aniosVigencia: { type: 'integer', minimum: 1, maximum: 30 },
      responsable: { type: 'string' },
      tipo: { type: 'string' },
      carpeta: { type: 'string' },
    },
    ['archivo', 'titulo', 'programaId', 'categoria', 'evidenciaId', 'responsable'],
  )
  @UseInterceptors(FileInterceptor('archivo'))
  crearConArchivo(@Body() dto: CrearAnexoConArchivoDto, @UploadedFile() archivo: Express.Multer.File) {
    return this.vigenciasService.crearAnexoConArchivo(dto, archivo);
  }

  @Patch(':id')
  @Roles(RolUsuario.Administrador, RolUsuario.Revisor)
  @ApiContrato({
    resumen: 'Actualiza un anexo de vigencia',
    roles: ['Administrador', 'Revisor'],
    tambien: [404],
  })
  actualizar(@Param('id') id: string, @Body() dto: ActualizarAnexoDto) {
    return this.vigenciasService.actualizarAnexo(id, dto);
  }

  @Delete(':id')
  @Roles(RolUsuario.Administrador)
  @ApiContrato({
    resumen: 'Elimina un anexo de vigencia',
    roles: ['Administrador'],
    tambien: [404],
  })
  eliminar(@Param('id') id: string) {
    return this.vigenciasService.eliminarAnexo(id);
  }

  @Post('ejecutar-cron')
  @Roles(RolUsuario.Administrador)
  @ApiContrato({
    resumen: 'Ejecuta a mano el recálculo diario de vigencias',
    roles: ['Administrador'],
    creacion: true,
    detalle: 'Misma rutina que el cron de las 06:00 America/Bogota.',
  })
  ejecutarCronManual() {
    return this.vigenciasService.actualizarVigenciasDiarias();
  }
}
