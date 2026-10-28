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
import { RolUsuario } from '@prisma/client';
import { VigenciasService } from './vigencias.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ActualizarAnexoDto, CrearAnexoConArchivoDto } from './dto/anexo-vigencia.dto';
import { PaquetesRegistroVigenciaService } from './paquetes-registro-vigencia.service';
import { VigenciaDemoService } from './vigencia-demo.service';
import { DetenerDemoVigenciaDto, IniciarDemoVigenciaDto } from './dto/vigencia-demo.dto';
import type { AlcancePaqueteVigencia } from './paquetes-registro-vigencia.service';
import { EvaluadorVigenciaRegistroService } from './evaluador-vigencia-registro.service';

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
  listar(@Query('programaId') programaId?: string) {
    return this.vigenciasService.listarAnexos(programaId);
  }

  @Get('anexos')
  listarAnexos(@Query('programaId') programaId?: string) {
    return this.vigenciasService.listarAnexos(programaId);
  }

  @Get('paquetes-registro')
  listarPaquetesRegistro(@Query('programaId') programaId?: string) {
    return this.paquetesRegistro.listar(programaId);
  }

  @Get('demo/estado')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
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
  async iniciarDemo(@Body() dto: IniciarDemoVigenciaDto) {
    const sesion = this.vigenciaDemo.iniciar(dto.alcance, dto.entidadId);
    await this.evaluadorVigenciaRegistro.evaluarTodasLasEntidades(new Date(), { soloSesionesDemo: true });
    return { inicioAtMs: sesion.inicioAtMs };
  }

  @Post('demo/detener')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  detenerDemo(@Body() dto: DetenerDemoVigenciaDto) {
    this.vigenciaDemo.detener(dto.alcance, dto.entidadId);
    return { detenida: true };
  }

  @Get(':id/descargar')
  descargar(@Param('id') id: string) {
    return this.vigenciasService.obtenerUrlDescarga(id);
  }

  @Post('con-archivo')
  @Roles(RolUsuario.Administrador)
  @UseInterceptors(FileInterceptor('archivo'))
  crearConArchivo(@Body() dto: CrearAnexoConArchivoDto, @UploadedFile() archivo: Express.Multer.File) {
    return this.vigenciasService.crearAnexoConArchivo(dto, archivo);
  }

  @Patch(':id')
  @Roles(RolUsuario.Administrador, RolUsuario.Revisor)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarAnexoDto) {
    return this.vigenciasService.actualizarAnexo(id, dto);
  }

  @Delete(':id')
  @Roles(RolUsuario.Administrador)
  eliminar(@Param('id') id: string) {
    return this.vigenciasService.eliminarAnexo(id);
  }

  @Post('ejecutar-cron')
  @Roles(RolUsuario.Administrador)
  ejecutarCronManual() {
    return this.vigenciasService.actualizarVigenciasDiarias();
  }
}
