import { Body, Controller, HttpCode, HttpStatus, INestApplication, Post, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SkipThrottle, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { configurarConfianzaProxy } from '../common/config/confianza-proxy';
import { limiteLoginIntentos } from '../common/config/limites-auth';
import { GuardiaTasaLogin } from './guardia-tasa-login';

class IniciarSesionDto {
  correo!: string;
  contrasena!: string;
}

@Controller('auth')
class ControladorLoginPrueba {
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle({ cifras: true })
  @UseGuards(GuardiaTasaLogin)
  iniciarSesion(@Body() _dto: IniciarSesionDto) {
    return { token: 'prueba', usuario: { id: '1' } };
  }
}

describe('límite de tasa en POST /auth/login', () => {
  let app: INestApplication;
  const limite = 3;

  beforeAll(async () => {
    process.env.AUTH_LOGIN_LIMITE_INTENTOS = String(limite);
    process.env.AUTH_LOGIN_LIMITE_TTL_MS = '60000';
    process.env.TRUST_PROXY = 'false';

    const modulo = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [
            { name: 'login', ttl: 60_000, limit: limiteLoginIntentos() },
            { name: 'cifras', ttl: 60_000, limit: 120 },
          ],
        }),
      ],
      controllers: [ControladorLoginPrueba],
      providers: [GuardiaTasaLogin],
    }).compile();

    const aplicacion = modulo.createNestApplication();
    configurarConfianzaProxy(aplicacion);
    await aplicacion.init();
    app = aplicacion;
  });

  afterAll(async () => {
    await app.close();
  });

  it(`permite ${limite} intentos y responde 429 en español al siguiente`, async () => {
    const cuerpo = { correo: 'prueba@uniautonoma.edu.co', contrasena: 'incorrecta' };
    for (let i = 0; i < limite; i += 1) {
      await request(app.getHttpServer()).post('/auth/login').send(cuerpo).expect(200);
    }
    const bloqueado = await request(app.getHttpServer()).post('/auth/login').send(cuerpo).expect(429);
    expect(bloqueado.body.message).toBe(
      'Demasiados intentos de inicio de sesión. Intente de nuevo en un minuto.',
    );
  });
});
