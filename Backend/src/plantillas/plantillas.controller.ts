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
import { RolUsuario } from '@prisma/client';
import { PlantillasService } from './plantillas.service';
import { CrearPlantillaDto, ActualizarPlantillaDto } from './dto/plantilla.dto';
import { Roles, RolesGuard } from '../common/guards/roles.guard';

@Controller('plantillas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PlantillasController {
  constructor(private readonly plantillasService: PlantillasService) {}

  @Get()
  listar(
    @Request() req: { user: { rol: RolUsuario } },
    @Query('tipoTramite') tipoTramite?: TipoTramitePlantilla,
  ) {
    return this.plantillasService.listar(req.user.rol, tipoTramite);
  }

  @Post()
  @Roles(RolUsuario.Administrador, RolUsuario.Revisor)
  @UseInterceptors(FileInterceptor('archivo'))
  crear(
    @Body() dto: CrearPlantillaDto,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    return this.plantillasService.crear(dto, archivo);
  }

  @Patch(':id')
  @Roles(RolUsuario.Administrador, RolUsuario.Revisor)
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarPlantillaDto,
    @Request() req: { user: { rol: RolUsuario } },
  ) {
    return this.plantillasService.actualizar(id, dto, req.user.rol);
  }

  @Delete(':id')
  @Roles(RolUsuario.Administrador, RolUsuario.Revisor)
  deshabilitar(
    @Param('id') id: string,
    @Request() req: { user: { rol: RolUsuario } },
  ) {
    return this.plantillasService.deshabilitar(id, req.user.rol);
  }

  @Get(':id/descargar')
  descargar(@Param('id') id: string) {
    return this.plantillasService.obtenerUrlDescarga(id);
  }

  @Get(':id/contenido')
  async contenido(@Param('id') id: string) {
    const archivo = await this.plantillasService.obtenerContenidoArchivo(id);
    return new StreamableFile(archivo.buffer, {
      type: archivo.mimeType,
      disposition: `inline; filename="${encodeURIComponent(archivo.nombreArchivo)}"`,
    });
  }

  @Patch(':id/archivo')
  @Roles(RolUsuario.Administrador, RolUsuario.Revisor)
  @UseInterceptors(FileInterceptor('archivo'))
  reemplazarArchivo(
    @Param('id') id: string,
    @UploadedFile() archivo: Express.Multer.File,
    @Request() req: { user: { rol: RolUsuario } },
  ) {
    return this.plantillasService.reemplazarArchivo(id, archivo, req.user.rol);
  }
}
