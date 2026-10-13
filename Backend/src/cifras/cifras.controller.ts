import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { Response } from 'express';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { CifrasImportacionService, MAX_BYTES_XLSX, MIME_XLSX } from './cifras-importacion.service';
import { CifrasService } from './cifras.service';
import {
  ActualizarVariableCifraDto,
  ConsultaCifrasQueryDto,
  ConsultaFiltrosCifrasQueryDto,
  ConsultaVariablesCifrasQueryDto,
  PlantillaJsonCifrasDto,
  RespuestaCategoriasCifrasDto,
  RespuestaCifrasDto,
  RespuestaFiltrosCifrasDto,
  RespuestaIngestaCifrasDto,
  RespuestaVariablesCifrasDto,
  VariableCifraDto,
} from './dto/cifras.dto';
import { IngestaCifrasDto } from './dto/ingesta-cifras.dto';
import { FiltroTamanoCifras } from './filtros/filtro-tamano-cifras';
import { CifrasApiKeyGuard } from './guards/cifras-api-key.guard';

const ROLES_LECTURA: RolUsuario[] = [
  RolUsuario.Administrador,
  RolUsuario.ParAcademico,
  RolUsuario.Revisor,
];

@ApiTags('cifras')
@ApiBearerAuth()
@Controller('cifras')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CifrasController {
  constructor(
    private readonly cifrasService: CifrasService,
    private readonly importacionService: CifrasImportacionService,
  ) {}

  @Get('categorias')
  @Roles(...ROLES_LECTURA)
  @ApiOkResponse({ type: RespuestaCategoriasCifrasDto })
  listarCategorias() {
    return this.cifrasService.listarCategorias();
  }

  @Get('variables')
  @Roles(RolUsuario.Administrador)
  @ApiOkResponse({ type: RespuestaVariablesCifrasDto })
  listarVariables(@Query() consulta: ConsultaVariablesCifrasQueryDto) {
    return this.cifrasService.listarVariables(consulta.categoriaId);
  }

  @Patch('variables/:id')
  @Roles(RolUsuario.Administrador)
  @ApiOkResponse({ type: VariableCifraDto })
  actualizarVariable(
    @Param('id') id: string,
    @Body() dto: ActualizarVariableCifraDto,
  ) {
    return this.cifrasService.actualizarVariable(id, dto);
  }

  /** Compatibilidad con el endpoint heredado (delega en GET /cifras/:categoriaId). */
  @Get('estudiantes')
  @Roles(...ROLES_LECTURA)
  @ApiOkResponse({ type: RespuestaCifrasDto })
  obtenerEstudiantes(@Query() consulta: ConsultaCifrasQueryDto) {
    return this.cifrasService.obtenerEstudiantes(consulta.periodo);
  }

  @Get(':categoriaId/plantilla')
  @Roles(...ROLES_LECTURA)
  @ApiProduces(MIME_XLSX)
  async descargarPlantilla(
    @Param('categoriaId') categoriaId: string,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<StreamableFile> {
    const { buffer, nombreArchivo, mimeType } =
      await this.importacionService.generarPlantilla(categoriaId);
    respuesta.setHeader('Content-Type', mimeType);
    respuesta.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    return new StreamableFile(buffer);
  }

  @Get(':categoriaId/plantilla.json')
  @Roles(...ROLES_LECTURA)
  @ApiOkResponse({ type: PlantillaJsonCifrasDto })
  descargarPlantillaJson(@Param('categoriaId') categoriaId: string) {
    return this.cifrasService.generarPlantillaJson(categoriaId);
  }

  @Get(':categoriaId/filtros')
  @Roles(...ROLES_LECTURA)
  @ApiOkResponse({ type: RespuestaFiltrosCifrasDto })
  obtenerFiltros(
    @Param('categoriaId') categoriaId: string,
    @Query() consulta: ConsultaFiltrosCifrasQueryDto,
  ) {
    return this.cifrasService.obtenerFiltros(categoriaId, consulta);
  }

  @Post(':categoriaId/ingesta')
  @Roles(RolUsuario.Administrador)
  @UseGuards(CifrasApiKeyGuard)
  @ApiHeader({
    name: 'x-api-key',
    required: true,
    description: 'Clave de integración (CIFRAS_API_KEY).',
  })
  @ApiOkResponse({ type: RespuestaIngestaCifrasDto })
  ingestar(
    @Param('categoriaId') categoriaId: string,
    @Body() dto: IngestaCifrasDto,
    @Req() solicitud: { user?: { id: string } },
  ) {
    return this.cifrasService.ingestar(categoriaId, dto, solicitud.user?.id);
  }

  @Post(':categoriaId/importar')
  @Roles(RolUsuario.Administrador)
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: MAX_BYTES_XLSX } }),
  )
  @UseFilters(FiltroTamanoCifras)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { archivo: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: RespuestaIngestaCifrasDto })
  importar(
    @Param('categoriaId') categoriaId: string,
    @UploadedFile() archivo: Express.Multer.File,
    @Req() solicitud: { user?: { id: string } },
  ) {
    if (!archivo) {
      throw new BadRequestException('Se requiere un archivo Excel (.xlsx).');
    }
    const esXlsx =
      archivo.mimetype === MIME_XLSX ||
      archivo.originalname.toLowerCase().endsWith('.xlsx');
    if (!esXlsx) {
      throw new BadRequestException('Solo se permiten archivos .xlsx.');
    }
    return this.cifrasService.importarExcel(categoriaId, archivo, solicitud.user?.id);
  }

  @Get(':categoriaId')
  @Roles(...ROLES_LECTURA)
  @ApiOkResponse({ type: RespuestaCifrasDto })
  obtenerCategoria(
    @Param('categoriaId') categoriaId: string,
    @Query() consulta: ConsultaCifrasQueryDto,
  ) {
    return this.cifrasService.obtenerCategoria(categoriaId, consulta);
  }
}
