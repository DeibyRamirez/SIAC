/**
 * E2E del código 429 en login (módulo acotado; el resto de E2E usa AUTH_LOGIN_LIMITE_INTENTOS alto en CI).
 */
import { Body, Controller, HttpCode, HttpStatus, INestApplication, Post, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SkipThrottle, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { configurarConfianzaProxy } from '../../src/common/config/confianza-proxy';
import { limiteLoginIntentos } from '../../src/common/config/limites-auth';
import { GuardiaTasaLogin } from '../../src/auth/guardia-tasa-login';

@Controller('auth')
class ControladorLoginE2E {
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle({ cifras: true })
  @UseGuards(GuardiaTasaLogin)
  login(@Body() body: { correo: string; contrasena: string }) {
  if (body.correo === 'ok@uniautonoma.edu.co') {
      return { token: 'jwt', usuario: { id: 'u1' } };
    }
    return { statusCode: 401, message: 'Credenciales inválidas' };
  }
}

describe('E2E — 429 en POST /auth/login', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.AUTH_LOGIN_LIMITE_INTENTOS = '2';
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
      controllers: [ControladorLoginE2E],
      providers: [GuardiaTasaLogin],
    }).compile();

    app = modulo.createNestApplication();
    app.setGlobalPrefix('api/v1');
    configurarConfianzaProxy(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('devuelve 429 tras superar el cupo por IP', async () => {
    const ruta = '/api/v1/auth/login';
    const cuerpo = { correo: 'ok@uniautonoma.edu.co', contrasena: 'x' };
    await request(app.getHttpServer()).post(ruta).send(cuerpo).expect(200);
    await request(app.getHttpServer()).post(ruta).send(cuerpo).expect(200);
    const bloqueado = await request(app.getHttpServer()).post(ruta).send(cuerpo).expect(429);
    expect(bloqueado.body.message).toMatch(/Demasiados intentos/);
  });
});
