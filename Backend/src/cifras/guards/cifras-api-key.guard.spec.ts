import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CifrasApiKeyGuard } from './cifras-api-key.guard';

function contextoConApiKey(valor?: string | string[]): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: valor === undefined ? {} : { 'x-api-key': valor },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('CifrasApiKeyGuard', () => {
  const guard = (configuracion: Record<string, string>) =>
    new CifrasApiKeyGuard(new ConfigService(configuracion));

  it('rechaza la petición sin header x-api-key', () => {
    const instancia = guard({ cifrasApiKey: 'clave-secreta' });
    expect(() => instancia.canActivate(contextoConApiKey())).toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza una clave incorrecta del mismo tamaño', () => {
    const instancia = guard({ cifrasApiKey: 'clave-secreta' });
    expect(() => instancia.canActivate(contextoConApiKey('clave-secretb'))).toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza una clave con longitud distinta sin romper la comparación', () => {
    const instancia = guard({ cifrasApiKey: 'clave-secreta' });
    expect(() => instancia.canActivate(contextoConApiKey('corta'))).toThrow(
      UnauthorizedException,
    );
  });

  it('acepta la clave correcta', () => {
    const instancia = guard({ cifrasApiKey: 'clave-secreta' });
    expect(instancia.canActivate(contextoConApiKey('clave-secreta'))).toBe(true);
  });

  it('acepta CIFRAS_API_KEY directa del entorno', () => {
    const instancia = guard({ CIFRAS_API_KEY: 'otra-clave' });
    expect(instancia.canActivate(contextoConApiKey('otra-clave'))).toBe(true);
  });

  it('rechaza cuando no hay clave configurada (fail closed)', () => {
    const instancia = guard({});
    expect(() => instancia.canActivate(contextoConApiKey('cualquiera'))).toThrow(
      UnauthorizedException,
    );
  });
});
