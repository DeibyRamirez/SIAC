import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { IntegracionService } from './integracion.service';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ApiContrato } from '../openapi/api-contrato';
import { EstadoStorageDto, ResultadoSincronizacionDto } from '../openapi/modelos-respuesta';

@ApiTags('Integración')
@Controller('integracion')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class IntegracionController {
  constructor(
    private readonly integracionService: IntegracionService,
    private readonly almacenamiento: AlmacenamientoService,
  ) {}

  @Get('estado-storage')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Estado de la conexión de almacenamiento y de cada bucket',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: EstadoStorageDto,
  })
  async estadoStorage() {
    // R-D 3b: incluye si cada bucket (evidencias, plantillas, documentos) existe de verdad.
    return {
      ...this.almacenamiento.obtenerEstadoConexion(),
      buckets: await this.almacenamiento.verificarBuckets(),
    };
  }

  @Post('sincronizar')
  @Roles(RolUsuario.Administrador)
  @ApiContrato({
    resumen: 'Sincroniza programas, usuarios y vínculos desde la API de TI',
    roles: ['Administrador'],
    respuesta: ResultadoSincronizacionDto,
    creacion: true,
    tambien: [502],
    detalle: 'Si TI_API_URL no está definida, cuenta la copia local (origen Manual) y responde 201.',
  })
  sincronizar() {
    return this.integracionService.sincronizarDesdeTi();
  }

  @Post('sincronizar-csv')
  @Roles(RolUsuario.Administrador)
  @ApiContrato({
    resumen: 'Sincroniza programas desde un CSV',
    roles: ['Administrador'],
    respuesta: ResultadoSincronizacionDto,
    creacion: true,
    detalle: 'La primera línea es encabezado. Cada fila es codigo,nombre,nivel,modalidad.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['contenido'],
      properties: {
        contenido: {
          type: 'string',
          description: 'CSV con encabezado. Columnas: codigo, nombre, nivel, modalidad.',
        },
      },
    },
  })
  sincronizarCsv(@Body('contenido') contenido: string) {
    return this.integracionService.sincronizarDesdeCsv(contenido);
  }

  @Post('sincronizar-carreras')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Sincroniza el catálogo de carreras desde la API externa',
    roles: ['Administrador', 'SuperAdmin'],
    creacion: true,
    tambien: [502],
    descripcionRespuesta: 'Conteo de programas importados y actualizados.',
  })
  sincronizarCarreras() {
    return this.integracionService.sincronizarDesdeCarreras();
  }
}
