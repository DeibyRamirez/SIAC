import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolUsuario } from '@prisma/client';
import { IntegracionService } from './integracion.service';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';

@Controller('integracion')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class IntegracionController {
  constructor(
    private readonly integracionService: IntegracionService,
    private readonly almacenamiento: AlmacenamientoService,
  ) {}

  @Get('estado-storage')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  async estadoStorage() {
    // R-D 3b: incluye si cada bucket (evidencias, plantillas, documentos) existe de verdad.
    return {
      ...this.almacenamiento.obtenerEstadoConexion(),
      buckets: await this.almacenamiento.verificarBuckets(),
    };
  }

  @Post('sincronizar')
  @Roles(RolUsuario.Administrador)
  sincronizar() {
    return this.integracionService.sincronizarDesdeTi();
  }

  @Post('sincronizar-csv')
  @Roles(RolUsuario.Administrador)
  sincronizarCsv(@Body('contenido') contenido: string) {
    return this.integracionService.sincronizarDesdeCsv(contenido);
  }

  @Post('sincronizar-carreras')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  sincronizarCarreras() {
    return this.integracionService.sincronizarDesdeCarreras();
  }
}
