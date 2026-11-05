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
import { ApiTags } from '@nestjs/swagger';
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
import { ApiContrato } from '../openapi/api-contrato';
import {
  ListaProgramasAsignadosDto,
  UsuarioConProgramasDto,
  UsuarioPublicoDto,
} from '../openapi/modelos-respuesta';

@ApiTags('Usuarios')
@Controller('usuarios')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsuariosController {
  constructor(
    private readonly usuarioRepo: UsuarioRepositorio,
    private readonly usuariosService: UsuariosService,
  ) {}

  @Get()
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Lista usuarios con sus programas asignados',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: UsuarioConProgramasDto,
    lista: true,
    detalle: 'No incluye la contraseña.',
  })
  async listar() {
    const usuarios = await this.usuarioRepo.listarTodosConProgramas();
    return usuarios.map(({ usuarioProgramas, ...usuario }) => ({
      ...usuario,
      programasAsignados: usuarioProgramas.map((vinculo) => vinculo.programa),
    }));
  }

  @Post()
  @Roles(RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Crea un usuario',
    roles: ['SuperAdmin'],
    respuesta: UsuarioPublicoDto,
    creacion: true,
    tambien: [409],
    detalle: 'El correo debe ser del dominio institucional. La contraseña sigue la política de 8 caracteres. La respuesta omite el hash.',
  })
  crear(@Body() dto: CrearUsuarioDto) {
    return this.usuariosService.crear(dto);
  }

  @Patch(':id')
  @Roles(RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Actualiza datos de un usuario',
    roles: ['SuperAdmin'],
    respuesta: UsuarioPublicoDto,
    tambien: [404],
    detalle: 'No puede desactivar su propia cuenta ni dejar la institución sin un SuperAdmin activo.',
  })
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarUsuarioDto,
    @Request() req: { user: UsuarioAlcance },
  ) {
    return this.usuariosService.actualizar(req.user.id, id, dto);
  }

  /** Baja lógica: activo=false. No elimina el registro en base de datos. */
  @Delete(':id')
  @Roles(RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Desactiva un usuario (baja lógica)',
    roles: ['SuperAdmin'],
    respuesta: UsuarioPublicoDto,
    tambien: [404],
    detalle: 'Pone activo=false. No borra la fila.',
  })
  desactivar(@Param('id') id: string, @Request() req: { user: UsuarioAlcance }) {
    return this.usuariosService.desactivar(req.user.id, id);
  }

  @Get(':id/programas')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Lista los programas asignados a un usuario',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: ListaProgramasAsignadosDto,
    tambien: [404],
  })
  listarProgramas(@Param('id') id: string) {
    return this.usuariosService.listarProgramas(id);
  }

  @Put(':id/programas')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Reemplaza los programas asignados',
    roles: ['Administrador', 'SuperAdmin'],
    descripcionRespuesta: 'Resultado de la asignación.',
    tambien: [404],
  })
  asignarProgramas(@Param('id') id: string, @Body() dto: AsignarProgramasDto) {
    return this.usuariosService.asignarProgramas(id, dto.programaIds);
  }

  @Put(':id/alcance-institucional')
  @Roles(RolUsuario.Administrador, RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Asigna o quita la responsabilidad del proceso institucional',
    roles: ['Administrador', 'SuperAdmin'],
    respuesta: UsuarioPublicoDto,
    tambien: [404],
  })
  asignarAlcanceInstitucional(
    @Param('id') id: string,
    @Body() dto: AsignarAlcanceInstitucionalDto,
  ) {
    return this.usuariosService.asignarAlcanceInstitucional(id, dto.responsable);
  }

  @Patch(':id/rol')
  @Roles(RolUsuario.SuperAdmin)
  @ApiContrato({
    resumen: 'Cambia el rol de un usuario',
    roles: ['SuperAdmin'],
    respuesta: UsuarioPublicoDto,
    tambien: [404],
    detalle: 'No deja la institución sin un SuperAdmin activo.',
  })
  actualizarRol(
    @Param('id') id: string,
    @Body() dto: ActualizarRolDto,
    @Request() req: { user: UsuarioAlcance },
  ) {
    return this.usuariosService.actualizarRol(req.user, id, dto.rol);
  }
}
