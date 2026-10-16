import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { RolUsuario } from '@prisma/client';
import { MENSAJE_POLITICA_CONTRASENA, REGEX_POLITICA_CONTRASENA } from '../politica-contrasena';

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
    responsableProcesoInstitucional: boolean;
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
  @MinLength(8, { message: MENSAJE_POLITICA_CONTRASENA })
  @Matches(REGEX_POLITICA_CONTRASENA, { message: MENSAJE_POLITICA_CONTRASENA })
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

  @IsOptional()
  @ValidateIf((o) => o.contrasena !== undefined && o.contrasena !== '')
  @IsString()
  @MinLength(8, { message: MENSAJE_POLITICA_CONTRASENA })
  @Matches(REGEX_POLITICA_CONTRASENA, { message: MENSAJE_POLITICA_CONTRASENA })
  contrasena?: string;
}
