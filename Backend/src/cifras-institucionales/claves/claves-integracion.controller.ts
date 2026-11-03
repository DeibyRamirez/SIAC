import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { ApiContrato } from '../../openapi/api-contrato';
import { ClavesIntegracionService } from './claves-integracion.service';
import { CrearIntegradorDto, IntegradorCreadoDto, IntegradorPublicoDto } from '../dto/cifras.dto';

@ApiTags('Claves de integración')
@Controller('integracion/claves')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ClavesIntegracionController {
  constructor(private readonly claves: ClavesIntegracionService) {}

  @Post()
  @Roles(RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Crea una clave de integrador',
    roles: ['SuperAdmin'],
    respuesta: IntegradorCreadoDto,
    creacion: true,
    detalle:
      'Devuelve la clave en claro una sola vez. En la base solo queda su hash SHA-256. La clave no se escribe en logs.',
  })
  crear(@Body() dto: CrearIntegradorDto) {
    return this.claves.crear(dto.nombre);
  }

  @Get()
  @Roles(RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Lista integradores sin la clave ni su hash',
    roles: ['SuperAdmin'],
    respuesta: IntegradorPublicoDto,
    lista: true,
  })
  listar() {
    return this.claves.listar();
  }

  @Post(':id/revocar')
  @HttpCode(HttpStatus.OK)
  @Roles(RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Revoca una clave de integrador',
    roles: ['SuperAdmin'],
    respuesta: IntegradorPublicoDto,
    tambien: [404],
    detalle: 'Deja la clave inactiva. Las cifras ya guardadas se conservan.',
  })
  revocar(@Param('id') id: string) {
    return this.claves.revocar(id);
  }
}
