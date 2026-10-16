import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EstadoEvidencia, RolUsuario } from '@prisma/client';
import { DocumentosService } from '../documentos/documentos.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { GuardAlcancePrograma } from '../common/alcance/guard-alcance-programa';
import { UsuarioAlcance } from '../common/alcance/servicio-alcance-programa';

/**
 * Compatibilidad de la ruta histórica `/aprobacion/pendientes`.
 * El dictamen canónico es POST /evidencias/:id/dictamen (el alias `POST /aprobacion/:id/dictaminar`
 * se retiró en T-006.2 porque el frontend no lo usa).
 */
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
}
