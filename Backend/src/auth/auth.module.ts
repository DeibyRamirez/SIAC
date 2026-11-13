import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsuarioRepositorio } from '../usuarios/usuario.repositorio';
import { GuardiaTasaLogin } from './guardia-tasa-login';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRETO') ?? 'dev-secreto',
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRACION') ?? '8h',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, UsuarioRepositorio, GuardiaTasaLogin],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
