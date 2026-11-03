import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { generarClaveApi } from './claves/hash-clave';
import { GuardiaClaveApi } from './guardia-clave-api';

describe('guardia de clave API', () => {
  const consulta = jest.fn();
  const ejecutar = jest.fn().mockResolvedValue(1);
  const prisma = { $queryRaw: consulta, $executeRaw: ejecutar };
  const guardia = new GuardiaClaveApi(prisma as never);

  function contexto(clave?: string) {
    const req: { headers: Record<string, string>; integrador?: { id: string } } = {
      headers: {},
    };
    if (clave !== undefined) req.headers['x-api-key'] = clave;
    return {
      req,
      contexto: {
        switchToHttp: () => ({ getRequest: () => req }),
      } as ExecutionContext,
    };
  }

  beforeEach(() => consulta.mockReset());

  it('rechaza la petición sin cabecera y no consulta la base', async () => {
    const { contexto: ctx } = contexto();
    await expect(guardia.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(consulta).not.toHaveBeenCalled();
  });

  it('acepta la clave cuyo hash coincide y no deja la clave en el integrador de la petición', async () => {
    const { clave, hashClave } = generarClaveApi();
    consulta.mockResolvedValueOnce([{ id: 'int-1', nombre: 'SIGA', hashClave }]);
    const { req, contexto: ctx } = contexto(clave);
    await expect(guardia.canActivate(ctx)).resolves.toBe(true);
    expect(req.integrador).toEqual({ id: 'int-1', nombre: 'SIGA' });
    expect(JSON.stringify(req.integrador)).not.toContain(clave);
  });

  it('rechaza una clave que no coincide con ningún hash activo', async () => {
    const ajena = generarClaveApi();
    consulta.mockResolvedValueOnce([{ id: 'int-1', nombre: 'SIGA', hashClave: ajena.hashClave }]);
    const { contexto: ctx } = contexto(generarClaveApi().clave);
    await expect(guardia.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
