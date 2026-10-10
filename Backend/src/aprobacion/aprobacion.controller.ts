import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EstadoEvidencia, RolUsuario } from '@prisma/client';
import { DocumentosService } from '../documentos/documentos.service';
import { DictaminarDto } from './dto/dictaminar.dto';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { AlcancePrograma } from '../common/alcance/alcance-programa.decorator';
import { GuardAlcancePrograma } from '../common/alcance/guard-alcance-programa';
import { UsuarioAlcance } from '../common/alcance/servicio-alcance-programa';

/** Rutas alias deprecadas — canónico: POST /evidencias/:id/dictamen */
@Controller('aprobacion')
@UseGuards(AuthGuard('jwt'), RolesGuard, GuardAlcancePrograma)
export class AprobacionController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Get('pendientes')
  @Roles(RolUsuario.Revisor, RolUsuario.Administrador)
  listarPendientes(@Request() req: { user: UsuarioAlcance }) {
    return this.documentosService.listar(req.user, {
      estado: EstadoEvidencia.EnRevision,
      limite: '100',
    });
  }

  @Post(':id/dictaminar')
  @Roles(RolUsuario.Revisor)
  @AlcancePrograma({ parametroEvidencia: 'id', modo: 'escritura' })
  dictaminar(
    @Param('id') id: string,
    @Body() dto: DictaminarDto,
    @Request() req: { user: UsuarioAlcance },
  ) {
    return this.documentosService.dictaminar(id, dto, req.user);
  }
}
