import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { RolUsuario, Usuario } from '@prisma/client';
import { UsuarioRepositorio } from './usuario.repositorio';
import { CrearUsuarioDto, ActualizarUsuarioDto } from '../auth/dto/auth.dto';
import { UsuarioAlcance } from '../common/alcance/servicio-alcance-programa';

type UsuarioSinContrasena = Omit<Usuario, 'contrasena'>;

@Injectable()
export class UsuariosService {
  constructor(
    private readonly usuarioRepo: UsuarioRepositorio,
    private readonly config: ConfigService,
  ) {}

  private sinContrasena(usuario: Usuario | UsuarioSinContrasena): UsuarioSinContrasena {
    const { contrasena: _omitida, ...resto } = usuario as Usuario;
    return resto;
  }

  private async asegurarQuedaSuperAdminActivo(usuario: Usuario): Promise<void> {
    if (usuario.rol !== RolUsuario.SuperAdmin || !usuario.activo) return;
    const activos = await this.usuarioRepo.contarActivosPorRol(RolUsuario.SuperAdmin);
    if (activos <= 1) {
      throw new BadRequestException('Debe quedar al menos un superadministrador activo.');
    }
  }

  async crear(dto: CrearUsuarioDto) {
    const dominio = this.config.get<string>('DOMINIO_INSTITUCIONAL') ?? 'uniautonoma.edu.co';
    const correo = dto.correo.trim().toLowerCase();

    if (!correo.endsWith(`@${dominio}`)) {
      throw new BadRequestException(`Solo se permiten cuentas @${dominio}.`);
    }

    const existente = await this.usuarioRepo.buscarPorCorreo(correo);
    if (existente) {
      throw new ConflictException('Ya existe un usuario con ese correo.');
    }

    const hash = await bcrypt.hash(dto.contrasena, 10);
    const creado = await this.usuarioRepo.crear({
      nombre: dto.nombre.trim(),
      correo,
      contrasena: hash,
      rol: dto.rol,
      cargo: dto.cargo,
      dependencia: dto.dependencia,
    });
    return this.sinContrasena(creado);
  }

  async actualizar(actorId: string, id: string, dto: ActualizarUsuarioDto) {
    const usuario = await this.usuarioRepo.buscarPorId(id);
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    if (dto.activo === false) {
      if (actorId === id) {
        throw new BadRequestException('No puede desactivar su propia cuenta.');
      }
      await this.asegurarQuedaSuperAdminActivo(usuario);
    }

    const datos: Record<string, unknown> = {};
    if (dto.nombre !== undefined) datos.nombre = dto.nombre.trim();
    if (dto.cargo !== undefined) datos.cargo = dto.cargo;
    if (dto.dependencia !== undefined) datos.dependencia = dto.dependencia;
    if (dto.activo !== undefined) datos.activo = dto.activo;
    if (dto.contrasena) {
      datos.contrasena = await bcrypt.hash(dto.contrasena, 10);
    }

    const actualizado = await this.usuarioRepo.actualizar(id, datos);
    return this.sinContrasena(actualizado);
  }

  async desactivar(actorId: string, id: string) {
    return this.actualizar(actorId, id, { activo: false });
  }

  async actualizarRol(actor: UsuarioAlcance, id: string, rol: RolUsuario) {
    const destino = await this.usuarioRepo.buscarPorId(id);
    if (!destino) throw new NotFoundException('Usuario no encontrado.');

    if (actor.rol !== RolUsuario.SuperAdmin) {
      throw new ForbiddenException('Solo el superadministrador puede cambiar roles.');
    }

    if (
      destino.rol === RolUsuario.SuperAdmin &&
      rol !== RolUsuario.SuperAdmin &&
      destino.activo
    ) {
      await this.asegurarQuedaSuperAdminActivo(destino);
    }

    const actualizado = await this.usuarioRepo.actualizarRol(id, rol);
    return this.sinContrasena(actualizado);
  }

  async listarProgramas(usuarioId: string) {
    const usuario = await this.usuarioRepo.buscarPorId(usuarioId);
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');
    const vinculos = await this.usuarioRepo.listarProgramas(usuarioId);
    return { datos: vinculos.map((vinculo) => vinculo.programa) };
  }

  async asignarProgramas(usuarioId: string, programaIds: string[]) {
    const usuario = await this.usuarioRepo.buscarPorId(usuarioId);
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    if (
      usuario.rol !== RolUsuario.Cargador &&
      usuario.rol !== RolUsuario.Revisor
    ) {
      throw new BadRequestException(
        'Solo se pueden asignar programas a cargadores y revisores.',
      );
    }

    const unicos = [...new Set(programaIds)];
    if (unicos.length > 0) {
      const existentes = await this.usuarioRepo.contarProgramas(unicos);
      if (existentes !== unicos.length) {
        throw new BadRequestException('Hay programas que no existen.');
      }
    }

    const vinculos = await this.usuarioRepo.reemplazarProgramas(usuarioId, unicos);
    return { datos: vinculos.map((vinculo) => vinculo.programa) };
  }

  async asignarAlcanceInstitucional(usuarioId: string, responsable: boolean) {
    const usuario = await this.usuarioRepo.buscarPorId(usuarioId);
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    if (
      usuario.rol !== RolUsuario.Cargador &&
      usuario.rol !== RolUsuario.Revisor
    ) {
      throw new BadRequestException(
        'El proceso institucional solo se asigna a cargadores y revisores.',
      );
    }

    const actualizado = await this.usuarioRepo.actualizarAlcanceInstitucional(
      usuarioId,
      responsable,
    );
    return { datos: actualizado };
  }
}
