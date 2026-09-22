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
import { AuthService } from './auth.service';
import { IniciarSesionDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  iniciarSesion(@Body() dto: IniciarSesionDto) {
    return this.authService.iniciarSesion(dto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  iniciarSesionGoogle() {
    throw new NotImplementedException(
      'OAuth Google institucional pendiente de habilitación por TI (ADR-003).',
    );
  }

  @Get('perfil')
  @UseGuards(AuthGuard('jwt'))
  obtenerPerfil(@Request() req: { user: unknown }) {
    return req.user;
  }
}
