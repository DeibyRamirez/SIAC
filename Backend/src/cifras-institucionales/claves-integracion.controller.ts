import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ApiContrato } from '../openapi/api-contrato';
import { ClaveIntegracionPublicaDto, ClaveIntegracionCreadaDto } from '../openapi/modelos-respuesta';
import { ClavesIntegracionService } from './claves-integracion.service';
import { ActualizarClaveIntegracionDto, CrearClaveIntegracionDto } from './dto/clave-integracion.dto';

@ApiTags('Cifras institucionales')
@Controller('integracion/cifras-institucionales/claves')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ClavesIntegracionController {
  constructor(private readonly claves: ClavesIntegracionService) {}

  @Get()
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Lista las claves de integración (sin el secreto)',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: ClaveIntegracionPublicaDto,
    lista: true,
  })
  listar() {
    return this.claves.listar();
  }

  @Post()
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Crea una clave de integración',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: ClaveIntegracionCreadaDto,
    creacion: true,
    detalle: 'El secreto en claro solo aparece en esta respuesta. Guárdelo: no se puede volver a leer.',
  })
  crear(
    @Body() dto: CrearClaveIntegracionDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.claves.crear(dto, req.user.id);
  }

  @Patch(':id')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Actualiza categorías o activa/revoca una clave',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: ClaveIntegracionPublicaDto,
    tambien: [404],
  })
  actualizar(@Param('id') id: string, @Body() dto: ActualizarClaveIntegracionDto) {
    return this.claves.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Revoca una clave (queda inactiva)',
    roles: ['Administrador', 'SuperAdmin'],
    sinValidacion: true,
    sinCuerpo: true,
    tambien: [404],
    detalle: 'No borra el registro ni los envíos asociados. El secreto deja de autenticar.',
  })
  revocar(@Param('id') id: string) {
    return this.claves.revocar(id);
  }
}
