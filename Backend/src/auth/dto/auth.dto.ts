import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { RolUsuario } from '@prisma/client';

export class IniciarSesionDto {
  @IsEmail()
  @IsNotEmpty()
  correo!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  contrasena!: string;
}

export class RespuestaAuthDto {
  token!: string;
  usuario!: {
    id: string;
    nombre: string;
    correo: string;
    rol: RolUsuario;
  };
}

export class ActualizarRolDto {
  @IsEnum(RolUsuario)
  rol!: RolUsuario;
}

export class CrearUsuarioDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsEmail()
  @IsNotEmpty()
  correo!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  contrasena!: string;

  @IsEnum(RolUsuario)
  rol!: RolUsuario;

  @IsString()
  @IsOptional()
  cargo?: string;

  @IsString()
  @IsOptional()
  dependencia?: string;
}

export class ActualizarUsuarioDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  cargo?: string;

  @IsString()
  @IsOptional()
  dependencia?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsString()
  @IsOptional()
  @MinLength(6)
  contrasena?: string;
}
