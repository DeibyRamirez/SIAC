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
import { TipoTramitePlantilla } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { PlantillasService } from './plantillas.service';
import { CrearPlantillaDto, ActualizarPlantillaDto } from './dto/plantilla.dto';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { crearPipeTipoTramite } from './pipes/tipo-tramite.pipe';
import {
  ApiContrato,
  ApiMultipart,
  MIME_DOCX_SIAC,
  PROPIEDAD_ARCHIVO_DOCX,
} from '../openapi/api-contrato';
import { UrlFirmadaDto } from '../openapi/modelos-respuesta';

@ApiTags('Plantillas')
@Controller('plantillas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PlantillasController {
  constructor(private readonly plantillasService: PlantillasService) {}

  @Get()
  @ApiQuery({ name: 'tipoTramite', required: false, enum: ['Renovacion', 'NuevoPrograma', 'General'] })
  @ApiContrato({
    resumen: 'Lista plantillas vigentes',
    roles: ['autenticado'],
    descripcionRespuesta: 'Plantillas visibles para el rol. tipoTramite inválido responde 400.',
  })
  listar(
    @Request() req: { user: { rol: RolUsuario } },
    @Query('tipoTramite', crearPipeTipoTramite()) tipoTramite?: TipoTramitePlantilla,
  ) {
    return this.plantillasService.listar(req.user.rol, tipoTramite);
  }

  @Post()
  @Roles(RolUsuario.Administrador, RolUsuario.Revisor)
  @ApiContrato({
    resumen: 'Crea una plantilla .docx',
    roles: ['Administrador', 'Revisor'],
    creacion: true,
    detalle: 'El archivo es obligatorio y debe ser .docx.',
  })
  @ApiMultipart(
    {
      archivo: PROPIEDAD_ARCHIVO_DOCX,
      nombre: { type: 'string' },
      formato: { type: 'string', enum: ['PDF', 'DOCX', 'XLSX'] },
      version: { type: 'string' },
      categoria: { type: 'string', enum: ['Institucional', 'Programa', 'Autoevaluacion'] },
      descripcion: { type: 'string' },
      tipoTramite: { type: 'string', enum: ['Renovacion', 'NuevoPrograma', 'General'] },
      esGuiaDocumentoMaestro: { type: 'boolean' },
      codigoGuia: { type: 'string', enum: ['G1', 'G2', 'G3', 'G4'] },
    },
    ['archivo', 'nombre', 'formato', 'version', 'categoria', 'codigoGuia'],
  )
  @UseInterceptors(FileInterceptor('archivo'))
  crear(
    @Body() dto: CrearPlantillaDto,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    return this.plantillasService.crear(dto, archivo);
  }

  @Patch(':id')
  @Roles(RolUsuario.Administrador, RolUsuario.Revisor)
  @ApiContrato({
    resumen: 'Actualiza metadatos de una plantilla',
    roles: ['Administrador', 'Revisor'],
    tambien: [404],
  })
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarPlantillaDto,
    @Request() req: { user: { rol: RolUsuario } },
  ) {
    return this.plantillasService.actualizar(id, dto, req.user.rol);
  }

  @Delete(':id')
  @Roles(RolUsuario.Administrador, RolUsuario.Revisor)
  @ApiContrato({
    resumen: 'Deja la plantilla no vigente',
    roles: ['Administrador', 'Revisor'],
    tambien: [404],
    detalle: 'No borra el archivo. Pone vigente=false.',
  })
  deshabilitar(
    @Param('id') id: string,
    @Request() req: { user: { rol: RolUsuario } },
  ) {
    return this.plantillasService.deshabilitar(id, req.user.rol);
  }

  @Get(':id/descargar')
  @ApiContrato({
    resumen: 'URL firmada de la plantilla',
    roles: ['autenticado'],
    respuesta: UrlFirmadaDto,
    tambien: [404],
  })
  descargar(@Param('id') id: string) {
    return this.plantillasService.obtenerUrlDescarga(id);
  }

  @Get(':id/contenido')
  @ApiContrato({
    resumen: 'Contenido binario de la plantilla',
    roles: ['autenticado'],
    binario: MIME_DOCX_SIAC,
    tambien: [404],
  })
  async contenido(@Param('id') id: string) {
    const archivo = await this.plantillasService.obtenerContenidoArchivo(id);
    return new StreamableFile(archivo.buffer, {
      type: archivo.mimeType,
      disposition: `inline; filename="${encodeURIComponent(archivo.nombreArchivo)}"`,
    });
  }

  @Patch(':id/archivo')
  @Roles(RolUsuario.Administrador, RolUsuario.Revisor)
  @ApiContrato({
    resumen: 'Reemplaza el archivo de la plantilla',
    roles: ['Administrador', 'Revisor'],
    tambien: [404],
  })
  @ApiMultipart({ archivo: PROPIEDAD_ARCHIVO_DOCX }, ['archivo'])
  @UseInterceptors(FileInterceptor('archivo'))
  reemplazarArchivo(
    @Param('id') id: string,
    @UploadedFile() archivo: Express.Multer.File,
    @Request() req: { user: { rol: RolUsuario } },
  ) {
    return this.plantillasService.reemplazarArchivo(id, archivo, req.user.rol);
  }
}
