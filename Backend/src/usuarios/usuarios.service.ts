import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { RolUsuario } from '@prisma/client';
import { UsuarioRepositorio } from './usuario.repositorio';
import { CrearUsuarioDto, ActualizarUsuarioDto } from '../auth/dto/auth.dto';

@Injectable()
export class UsuariosService {
  constructor(
    private readonly usuarioRepo: UsuarioRepositorio,
    private readonly config: ConfigService,
  ) {}

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
    return this.usuarioRepo.crear({
      nombre: dto.nombre.trim(),
      correo,
      contrasena: hash,
      rol: dto.rol,
      cargo: dto.cargo,
      dependencia: dto.dependencia,
    });
  }

  async actualizar(id: string, dto: ActualizarUsuarioDto) {
    const usuario = await this.usuarioRepo.buscarPorId(id);
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    const datos: Record<string, unknown> = {};
    if (dto.nombre !== undefined) datos.nombre = dto.nombre.trim();
    if (dto.cargo !== undefined) datos.cargo = dto.cargo;
    if (dto.dependencia !== undefined) datos.dependencia = dto.dependencia;
    if (dto.activo !== undefined) datos.activo = dto.activo;
    if (dto.contrasena) {
      datos.contrasena = await bcrypt.hash(dto.contrasena, 10);
    }

    return this.usuarioRepo.actualizar(id, datos);
  }

  async desactivar(id: string) {
    return this.actualizar(id, { activo: false });
  }
}
