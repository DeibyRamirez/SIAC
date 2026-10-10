import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
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
import { AsignarProgramasDto } from './dto/asignar-programas.dto';
import { AsignarAlcanceInstitucionalDto } from './dto/asignar-alcance-institucional.dto';
import { UsuarioAlcance } from '../common/alcance/servicio-alcance-programa';

@Controller('usuarios')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsuariosController {
  constructor(
    private readonly usuarioRepo: UsuarioRepositorio,
    private readonly usuariosService: UsuariosService,
  ) {}

  @Get()
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  async listar() {
    const usuarios = await this.usuarioRepo.listarTodosConProgramas();
    return usuarios.map(({ usuarioProgramas, ...usuario }) => ({
      ...usuario,
      programasAsignados: usuarioProgramas.map((vinculo) => vinculo.programa),
    }));
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

  @Get(':id/programas')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  listarProgramas(@Param('id') id: string) {
    return this.usuariosService.listarProgramas(id);
  }

  @Put(':id/programas')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  asignarProgramas(@Param('id') id: string, @Body() dto: AsignarProgramasDto) {
    return this.usuariosService.asignarProgramas(id, dto.programaIds);
  }

  @Put(':id/alcance-institucional')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  asignarAlcanceInstitucional(
    @Param('id') id: string,
    @Body() dto: AsignarAlcanceInstitucionalDto,
  ) {
    return this.usuariosService.asignarAlcanceInstitucional(id, dto.responsable);
  }

  @Patch(':id/rol')
  @Roles(RolUsuario.SuperAdmin)
  actualizarRol(
    @Param('id') id: string,
    @Body() dto: ActualizarRolDto,
    @Request() req: { user: UsuarioAlcance },
  ) {
    return this.usuariosService.actualizarRol(req.user, id, dto.rol);
  }
}
