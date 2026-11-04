import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ClaveIntegracionGuard } from './clave-integracion.guard';

function contexto(
  headers: Record<string, string | undefined>,
  params?: { categoriaId?: string },
) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers, params }),
    }),
  } as never;
}

describe('ClaveIntegracionGuard', () => {
  it('rechaza una petición sin clave', async () => {
    const claves = { autenticar: jest.fn().mockResolvedValue(null) };
    const guard = new ClaveIntegracionGuard(claves as never);
    await expect(guard.canActivate(contexto({}))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza con 403 si la categoría no está en la clave', async () => {
    const claves = {
      autenticar: jest.fn().mockResolvedValue({
        id: 'c1',
        nombre: 'INV',
        categorias: ['investigacion'],
      }),
    };
    const guard = new ClaveIntegracionGuard(claves as never);
    await expect(
      guard.canActivate(
        contexto({ 'x-api-key': 'siac_live_x' }, { categoriaId: 'estudiantes' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deja pasar cuando la categoría está autorizada', async () => {
    const claves = {
      autenticar: jest.fn().mockResolvedValue({
        id: 'c1',
        nombre: 'FEAT',
        categorias: ['estudiantes'],
      }),
    };
    const guard = new ClaveIntegracionGuard(claves as never);
    await expect(
      guard.canActivate(
        contexto({ 'x-api-key': 'siac_live_x' }, { categoriaId: 'estudiantes' }),
      ),
    ).resolves.toBe(true);
  });
});
