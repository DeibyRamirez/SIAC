import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolUsuario } from '@prisma/client';
import { UsuarioRepositorio } from './usuario.repositorio';
import { UsuariosService } from './usuarios.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import {
  ActualizarRolDto,
  CrearUsuarioDto,
  ActualizarUsuarioDto,
} from '../auth/dto/auth.dto';

@Controller('usuarios')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsuariosController {
  constructor(
    private readonly usuarioRepo: UsuarioRepositorio,
    private readonly usuariosService: UsuariosService,
  ) {}

  @Get()
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  listar() {
    return this.usuarioRepo.listarTodos();
  }

  @Post()
  @Roles(RolUsuario.SuperAdmin)
  crear(@Body() dto: CrearUsuarioDto) {
    return this.usuariosService.crear(dto);
  }

  @Patch(':id')
  @Roles(RolUsuario.SuperAdmin)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarUsuarioDto) {
    return this.usuariosService.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles(RolUsuario.SuperAdmin)
  desactivar(@Param('id') id: string) {
    return this.usuariosService.desactivar(id);
  }

  @Patch(':id/rol')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  actualizarRol(@Param('id') id: string, @Body() dto: ActualizarRolDto) {
    return this.usuarioRepo.actualizarRol(id, dto.rol);
  }
}
