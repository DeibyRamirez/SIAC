import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { EstructuraService } from './estructura.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ApiContrato } from '../openapi/api-contrato';

const CUERPO_ETAPA = {
  type: 'object',
  required: ['nombre', 'tipo', 'descripcion', 'orden'],
  properties: {
    nombre: { type: 'string' },
    tipo: { type: 'string' },
    descripcion: { type: 'string' },
    orden: { type: 'number' },
  },
};

const CUERPO_ETAPA_PARCIAL = {
  type: 'object',
  properties: {
    nombre: { type: 'string' },
    descripcion: { type: 'string' },
    activa: { type: 'boolean' },
    orden: { type: 'number' },
  },
};

const CUERPO_CARPETA = {
  type: 'object',
  required: ['etapaId', 'nombre', 'descripcion', 'orden'],
  properties: {
    etapaId: { type: 'string' },
    condicionId: { type: 'string' },
    nombre: { type: 'string' },
    descripcion: { type: 'string' },
    orden: { type: 'number' },
  },
};

const CUERPO_DOCUMENTO = {
  type: 'object',
  required: ['carpetaId', 'nombre', 'esPlantilla', 'formato', 'obligatorio', 'orden'],
  properties: {
    carpetaId: { type: 'string' },
    nombre: { type: 'string' },
    esPlantilla: { type: 'boolean' },
    formato: { type: 'string', enum: ['PDF', 'DOCX', 'XLSX'] },
    obligatorio: { type: 'boolean' },
    orden: { type: 'number' },
  },
};

@ApiTags('Estructura')
@Controller('estructura')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EstructuraController {
  constructor(private readonly estructuraService: EstructuraService) {}

  @Get('etapas')
  @ApiContrato({
    resumen: 'Lista etapas, carpetas y documentos requeridos',
    roles: ['autenticado'],
    descripcionRespuesta: 'Árbol de etapas.',
  })
  listarEtapas() {
    return this.estructuraService.listarEtapas();
  }

  @Post('etapas')
  @Roles(RolUsuario.Administrador)
  @ApiContrato({ resumen: 'Crea una etapa', roles: ['Administrador'], creacion: true })
  @ApiBody({ schema: CUERPO_ETAPA })
  crearEtapa(@Body() body: { nombre: string; tipo: string; descripcion: string; orden: number }) {
    return this.estructuraService.crearEtapa(body);
  }

  @Patch('etapas/:id')
  @Roles(RolUsuario.Administrador)
  @ApiContrato({ resumen: 'Actualiza una etapa', roles: ['Administrador'], tambien: [404] })
  @ApiBody({ schema: CUERPO_ETAPA_PARCIAL })
  actualizarEtapa(@Param('id') id: string, @Body() body: Partial<{ nombre: string; descripcion: string; activa: boolean; orden: number }>) {
    return this.estructuraService.actualizarEtapa(id, body);
  }

  @Delete('etapas/:id')
  @Roles(RolUsuario.Administrador)
  @ApiContrato({ resumen: 'Elimina una etapa', roles: ['Administrador'], tambien: [404] })
  eliminarEtapa(@Param('id') id: string) {
    return this.estructuraService.eliminarEtapa(id);
  }

  @Post('carpetas')
  @Roles(RolUsuario.Administrador)
  @ApiContrato({ resumen: 'Crea una carpeta', roles: ['Administrador'], creacion: true })
  @ApiBody({ schema: CUERPO_CARPETA })
  crearCarpeta(@Body() body: { etapaId: string; condicionId?: string; nombre: string; descripcion: string; orden: number }) {
    return this.estructuraService.crearCarpeta(body);
  }

  @Patch('carpetas/:id')
  @Roles(RolUsuario.Administrador)
  @ApiContrato({ resumen: 'Actualiza una carpeta', roles: ['Administrador'], tambien: [404] })
  @ApiBody({ schema: CUERPO_ETAPA_PARCIAL })
  actualizarCarpeta(@Param('id') id: string, @Body() body: Partial<{ nombre: string; descripcion: string; activa: boolean; orden: number }>) {
    return this.estructuraService.actualizarCarpeta(id, body);
  }

  @Delete('carpetas/:id')
  @Roles(RolUsuario.Administrador)
  @ApiContrato({ resumen: 'Elimina una carpeta', roles: ['Administrador'], tambien: [404] })
  eliminarCarpeta(@Param('id') id: string) {
    return this.estructuraService.eliminarCarpeta(id);
  }

  @Post('documentos')
  @Roles(RolUsuario.Administrador)
  @ApiContrato({ resumen: 'Crea un documento requerido', roles: ['Administrador'], creacion: true })
  @ApiBody({ schema: CUERPO_DOCUMENTO })
  crearDocumento(@Body() body: { carpetaId: string; nombre: string; esPlantilla: boolean; formato: 'PDF' | 'DOCX' | 'XLSX'; obligatorio: boolean; orden: number }) {
    return this.estructuraService.crearDocumento(body);
  }

  @Patch('documentos/:id')
  @Roles(RolUsuario.Administrador)
  @ApiContrato({ resumen: 'Actualiza un documento requerido', roles: ['Administrador'], tambien: [404] })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        obligatorio: { type: 'boolean' },
        orden: { type: 'number' },
      },
    },
  })
  actualizarDocumento(@Param('id') id: string, @Body() body: Partial<{ nombre: string; obligatorio: boolean; orden: number }>) {
    return this.estructuraService.actualizarDocumento(id, body);
  }

  @Delete('documentos/:id')
  @Roles(RolUsuario.Administrador)
  @ApiContrato({ resumen: 'Elimina un documento requerido', roles: ['Administrador'], tambien: [404] })
  eliminarDocumento(@Param('id') id: string) {
    return this.estructuraService.eliminarDocumento(id);
  }
}
