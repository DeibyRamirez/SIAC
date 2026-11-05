import { Controller, Get, INestApplication, Post, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Throttle, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { GuardiaTasaCifras } from './guardia-tasa-cifras';

@Controller('tasa')
@UseGuards(GuardiaTasaCifras)
class ControladorTasa {
  @Get()
  @Throttle({ cifras: { limit: 2, ttl: 60_000 } })
  leer() {
    return { ok: true };
  }

  @Post()
  @Throttle({ cifras: { limit: 1, ttl: 60_000 } })
  enviar() {
    return { ok: true };
  }
}

describe('límite de tasa por clave', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ name: 'cifras', ttl: 60_000, limit: 120 }],
        }),
      ],
      controllers: [ControladorTasa],
      providers: [GuardiaTasaCifras],
    }).compile();

    const aplicacion = modulo.createNestApplication();
    await aplicacion.init();
    app = aplicacion;
  });

  afterAll(async () => {
    await app.close();
  });

  it('permite 1 POST y responde 429 en español al segundo, sin mezclar el cupo del GET', async () => {
    const clave = 'siac_clave-de-prueba';
    await request(app.getHttpServer()).post('/tasa').set('x-api-key', clave).expect(201);
    const bloqueado = await request(app.getHttpServer()).post('/tasa').set('x-api-key', clave).expect(429);
    expect(bloqueado.body.message).toBe(
      'Demasiadas solicitudes para esta clave. Intente de nuevo en un minuto.',
    );
    expect(JSON.stringify(bloqueado.body)).not.toContain(clave);

    await request(app.getHttpServer()).get('/tasa').set('x-api-key', clave).expect(200);
    await request(app.getHttpServer()).get('/tasa').set('x-api-key', clave).expect(200);
    await request(app.getHttpServer()).get('/tasa').set('x-api-key', clave).expect(429);
  });
});
