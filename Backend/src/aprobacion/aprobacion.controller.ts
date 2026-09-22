import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolUsuario } from '@prisma/client';
import { AprobacionService } from './aprobacion.service';
import { DocumentosService } from '../documentos/documentos.service';
import { DictaminarDto } from './dto/dictaminar.dto';
import { Roles, RolesGuard } from '../common/guards/roles.guard';

/** Rutas alias deprecadas — canónico: POST /evidencias/:id/dictamen */
@Controller('aprobacion')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AprobacionController {
  constructor(
    private readonly aprobacionService: AprobacionService,
    private readonly documentosService: DocumentosService,
  ) {}

  @Get('pendientes')
  @Roles(RolUsuario.Revisor, RolUsuario.Administrador)
  listarPendientes() {
    return this.aprobacionService.listarPendientes();
  }

  @Post(':id/dictaminar')
  @Roles(RolUsuario.Revisor)
  dictaminar(
    @Param('id') id: string,
    @Body() dto: DictaminarDto,
    @Request() req: { user: { id: string; rol: RolUsuario } },
  ) {
    return this.documentosService.dictaminar(id, dto, req.user);
  }
}
