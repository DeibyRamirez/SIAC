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

} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { AuthGuard } from '@nestjs/passport';

import { RolUsuario } from '@prisma/client';

import { VigenciasService } from './vigencias.service';

import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ActualizarAnexoDto, CrearAnexoConArchivoDto } from './dto/anexo-vigencia.dto';



@Controller('vigencias')

@UseGuards(AuthGuard('jwt'), RolesGuard)

export class VigenciasController {

  constructor(private readonly vigenciasService: VigenciasService) {}



  @Get()

  listar(@Query('programaId') programaId?: string) {

    return this.vigenciasService.listarAnexos(programaId);

  }



  @Get('anexos')

  listarAnexos(@Query('programaId') programaId?: string) {

    return this.vigenciasService.listarAnexos(programaId);

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

  // El alta sin archivo (POST /vigencias) se retiró: todo anexo debe tener documento y evidencia (PO, 06/10).

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


