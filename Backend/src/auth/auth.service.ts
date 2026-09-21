import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { IniciarSesionDto, RespuestaAuthDto } from './dto/auth.dto';
import { UsuarioRepositorio } from '../usuarios/usuario.repositorio';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarioRepo: UsuarioRepositorio,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async iniciarSesion(dto: IniciarSesionDto): Promise<RespuestaAuthDto> {
    const dominio = this.config.get<string>('DOMINIO_INSTITUCIONAL') ?? 'uniautonoma.edu.co';
    const correo = dto.correo.trim().toLowerCase();

    if (!correo.endsWith(`@${dominio}`)) {
      throw new UnauthorizedException(
        `Solo se permiten cuentas @${dominio}.`,
      );
    }

    const usuario = await this.usuarioRepo.buscarPorCorreo(correo);
    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const coincide = await bcrypt.compare(dto.contrasena, usuario.contrasena);
    if (!coincide) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const token = this.jwtService.sign({
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
    });

    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    };
  }
}
