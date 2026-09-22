import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolUsuario } from '@prisma/client';
import { EstructuraService } from './estructura.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';

@Controller('estructura')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EstructuraController {
  constructor(private readonly estructuraService: EstructuraService) {}

  @Get('etapas')
  listarEtapas() {
    return this.estructuraService.listarEtapas();
  }

  @Post('etapas')
  @Roles(RolUsuario.Administrador)
  crearEtapa(@Body() body: { nombre: string; tipo: string; descripcion: string; orden: number }) {
    return this.estructuraService.crearEtapa(body);
  }

  @Patch('etapas/:id')
  @Roles(RolUsuario.Administrador)
  actualizarEtapa(@Param('id') id: string, @Body() body: Partial<{ nombre: string; descripcion: string; activa: boolean; orden: number }>) {
    return this.estructuraService.actualizarEtapa(id, body);
  }

  @Delete('etapas/:id')
  @Roles(RolUsuario.Administrador)
  eliminarEtapa(@Param('id') id: string) {
    return this.estructuraService.eliminarEtapa(id);
  }

  @Post('carpetas')
  @Roles(RolUsuario.Administrador)
  crearCarpeta(@Body() body: { etapaId: string; condicionId?: string; nombre: string; descripcion: string; orden: number }) {
    return this.estructuraService.crearCarpeta(body);
  }

  @Patch('carpetas/:id')
  @Roles(RolUsuario.Administrador)
  actualizarCarpeta(@Param('id') id: string, @Body() body: Partial<{ nombre: string; descripcion: string; activa: boolean; orden: number }>) {
    return this.estructuraService.actualizarCarpeta(id, body);
  }

  @Delete('carpetas/:id')
  @Roles(RolUsuario.Administrador)
  eliminarCarpeta(@Param('id') id: string) {
    return this.estructuraService.eliminarCarpeta(id);
  }

  @Post('documentos')
  @Roles(RolUsuario.Administrador)
  crearDocumento(@Body() body: { carpetaId: string; nombre: string; esPlantilla: boolean; formato: 'PDF' | 'DOCX' | 'XLSX'; obligatorio: boolean; orden: number }) {
    return this.estructuraService.crearDocumento(body);
  }

  @Patch('documentos/:id')
  @Roles(RolUsuario.Administrador)
  actualizarDocumento(@Param('id') id: string, @Body() body: Partial<{ nombre: string; obligatorio: boolean; orden: number }>) {
    return this.estructuraService.actualizarDocumento(id, body);
  }

  @Delete('documentos/:id')
  @Roles(RolUsuario.Administrador)
  eliminarDocumento(@Param('id') id: string) {
    return this.estructuraService.eliminarDocumento(id);
  }
}
