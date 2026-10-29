import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  NotImplementedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { ApiContrato } from '../openapi/api-contrato';
import { UsuarioSesionDto } from '../openapi/modelos-respuesta';
import { AuthService } from './auth.service';
import { IniciarSesionDto, RespuestaAuthDto } from './dto/auth.dto';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiContrato({
    resumen: 'Inicia sesión con correo institucional y contraseña',
    roles: ['publico'],
    respuesta: RespuestaAuthDto,
    descripcionRespuesta: 'JWT y datos públicos del usuario. El estado HTTP es 200.',
    tambien: [401],
    detalle:
      'El correo debe pertenecer al dominio institucional. Un usuario inactivo recibe 401 y no obtiene token.',
  })
  iniciarSesion(@Body() dto: IniciarSesionDto) {
    return this.authService.iniciarSesion(dto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiContrato({
    resumen: 'OAuth Google institucional (no habilitado)',
    roles: ['publico'],
    sinValidacion: true,
    tambien: [501],
    detalle: 'Responde 501. El @HttpCode(200) no se alcanza porque el método lanza NotImplementedException.',
  })
  iniciarSesionGoogle() {
    throw new NotImplementedException(
      'OAuth Google institucional pendiente de habilitación por TI (ADR-003).',
    );
  }

  @Get('perfil')
  @UseGuards(AuthGuard('jwt'))
  @ApiContrato({
    resumen: 'Devuelve el usuario de la sesión',
    roles: ['autenticado'],
    respuesta: UsuarioSesionDto,
    detalle: 'El payload lo arma JwtStrategy: id, correo, nombre, rol y responsableProcesoInstitucional.',
  })
  obtenerPerfil(@Request() req: { user: unknown }) {
    return req.user;
  }
}
