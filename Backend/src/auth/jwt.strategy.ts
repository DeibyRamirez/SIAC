import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RolUsuario } from '@prisma/client';
import { UsuarioRepositorio } from '../usuarios/usuario.repositorio';

export interface PayloadJwt {
  sub: string;
  correo: string;
  rol: RolUsuario;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usuarioRepo: UsuarioRepositorio,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRETO') ?? 'dev-secreto',
    });
  }

  async validate(payload: PayloadJwt) {
    const usuario = await this.usuarioRepo.buscarPorId(payload.sub);
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Token inválido o usuario inactivo.');
    }
    return {
      id: usuario.id,
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: usuario.rol,
    };
  }
}
