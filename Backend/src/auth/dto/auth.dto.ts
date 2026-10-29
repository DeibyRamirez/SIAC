import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { UsuarioSesionDto } from '../../openapi/modelos-respuesta';
import { MENSAJE_POLITICA_CONTRASENA, REGEX_POLITICA_CONTRASENA } from '../politica-contrasena';

export class IniciarSesionDto {
  @ApiProperty({ example: 'persona@uniautonoma.edu.co' })
  @IsEmail()
  @IsNotEmpty()
  correo!: string;

  @ApiProperty({ minLength: 4, description: 'El login exige al menos 4 caracteres. No se documenta un valor de ejemplo.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  contrasena!: string;
}

export class RespuestaAuthDto {
  @ApiProperty({ description: 'JWT de sesión.' })
  token!: string;

  @ApiProperty({ type: UsuarioSesionDto })
  usuario!: UsuarioSesionDto;
}

export class ActualizarRolDto {
  @ApiProperty({ enum: RolUsuario })
  @IsEnum(RolUsuario)
  rol!: RolUsuario;
}

export class CrearUsuarioDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({ example: 'persona@uniautonoma.edu.co' })
  @IsEmail()
  @IsNotEmpty()
  correo!: string;

  @ApiProperty({ minLength: 8, description: MENSAJE_POLITICA_CONTRASENA })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: MENSAJE_POLITICA_CONTRASENA })
  @Matches(REGEX_POLITICA_CONTRASENA, { message: MENSAJE_POLITICA_CONTRASENA })
  contrasena!: string;

  @ApiProperty({ enum: RolUsuario })
  @IsEnum(RolUsuario)
  rol!: RolUsuario;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cargo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dependencia?: string;
}

export class ActualizarUsuarioDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cargo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dependencia?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @ApiPropertyOptional({ minLength: 8, description: MENSAJE_POLITICA_CONTRASENA })
  @IsOptional()
  @ValidateIf((o) => o.contrasena !== undefined && o.contrasena !== '')
  @IsString()
  @MinLength(8, { message: MENSAJE_POLITICA_CONTRASENA })
  @Matches(REGEX_POLITICA_CONTRASENA, { message: MENSAJE_POLITICA_CONTRASENA })
  contrasena?: string;
}
