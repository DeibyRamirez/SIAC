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
import { RolUsuario } from '@prisma/client';
import { IngestaService } from './ingesta.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';

@Controller('evidencias')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class IngestaController {
  constructor(private readonly ingestaService: IngestaService) {}

  @Post('parsear-excel')
  @Roles(RolUsuario.Cargador, RolUsuario.Administrador)
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
