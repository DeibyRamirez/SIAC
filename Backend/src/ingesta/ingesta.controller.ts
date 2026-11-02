import {
  Controller,
  Post,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { IngestaService } from './ingesta.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ApiContrato, ApiMultipart, PROPIEDAD_ARCHIVO_XLSX } from '../openapi/api-contrato';

@ApiTags('Evidencias')
@Controller('evidencias')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class IngestaController {
  constructor(private readonly ingestaService: IngestaService) {}

  @Post('parsear-excel')
  @Roles(RolUsuario.Cargador, RolUsuario.Administrador)
  @ApiContrato({
    resumen: 'Lee un Excel y devuelve filas interpretadas, sin guardarlas',
    roles: ['Cargador', 'Administrador'],
    creacion: true,
    descripcionRespuesta: 'Resultado del parseo (filas aceptadas y errores por fila).',
    detalle: 'Solo .xlsx. No persiste evidencias.',
  })
  @ApiMultipart({ archivo: PROPIEDAD_ARCHIVO_XLSX }, ['archivo'])
  @UseInterceptors(FileInterceptor('archivo'))
  async parsearExcel(
    @UploadedFile() archivo: Express.Multer.File,
    @Request() req: { user: { id: string } },
  ) {
    if (!archivo) {
      throw new BadRequestException('Se requiere un archivo Excel (.xlsx).');
    }

    const tiposPermitidos = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!tiposPermitidos.includes(archivo.mimetype)) {
      throw new BadRequestException('Solo se permiten archivos .xlsx');
    }

    return this.ingestaService.parsearExcel(archivo.buffer, req.user.id);
  }
}
