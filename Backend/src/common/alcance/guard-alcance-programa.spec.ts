import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '@prisma/client';
import { ALCANCE_PROGRAMA_KEY } from './alcance-programa.decorator';
import { GuardAlcancePrograma } from './guard-alcance-programa';
import { ServicioAlcancePrograma } from './servicio-alcance-programa';

function contextoDe(solicitud: Record<string, unknown>, opciones: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => solicitud,
    }),
  } as ExecutionContext;
}

describe('GuardAlcancePrograma', () => {
  const alcance = {
    estaAsignado: jest.fn(),
    programaDeEvidencia: jest.fn(),
  };
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const guard = new GuardAlcancePrograma(
    reflector as unknown as Reflector,
    alcance as unknown as ServicioAlcancePrograma,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('responde 403 si el revisor no tiene el programa de la evidencia', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      parametroEvidencia: 'id',
      modo: 'escritura',
    });
    alcance.programaDeEvidencia.mockResolvedValue('prog-ajeno');
    alcance.estaAsignado.mockResolvedValue(false);

    await expect(
      guard.canActivate(
        contextoDe(
          {
            method: 'POST',
            headers: {},
            params: { id: 'ev-1' },
            user: { id: 'rev-1', rol: RolUsuario.Revisor },
          },
          {},
        ),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(alcance.estaAsignado).toHaveBeenCalledWith('rev-1', 'prog-ajeno');
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ALCANCE_PROGRAMA_KEY, expect.any(Array));
  });

  it('deja pasar al revisor asignado', async () => {
    reflector.getAllAndOverride.mockReturnValue({ parametroPrograma: 'id', modo: 'lectura' });
    alcance.estaAsignado.mockResolvedValue(true);

    await expect(
      guard.canActivate(
        contextoDe(
          {
            method: 'GET',
            headers: {},
            params: { id: 'prog-1' },
            user: { id: 'rev-1', rol: RolUsuario.Revisor },
          },
          {},
        ),
      ),
    ).resolves.toBe(true);
  });

  it('el administrador lee sin asignación y el superadmin no consulta la base', async () => {
    reflector.getAllAndOverride.mockReturnValue({ parametroPrograma: 'id', modo: 'lectura' });

    await expect(
      guard.canActivate(
        contextoDe(
          {
            method: 'GET',
            headers: {},
            params: { id: 'prog-1' },
            user: { id: 'admin', rol: RolUsuario.Administrador },
          },
          {},
        ),
      ),
    ).resolves.toBe(true);

    reflector.getAllAndOverride.mockReturnValue({ parametroPrograma: 'id', modo: 'escritura' });
    await expect(
      guard.canActivate(
        contextoDe(
          {
            method: 'POST',
            headers: {},
            params: { id: 'prog-1' },
            user: { id: 'sa', rol: RolUsuario.SuperAdmin },
          },
          {},
        ),
      ),
    ).resolves.toBe(true);

    expect(alcance.estaAsignado).not.toHaveBeenCalled();
  });

  it('releé la asignación en cada petición', async () => {
    reflector.getAllAndOverride.mockReturnValue({ campoCuerpo: 'programaId', modo: 'escritura' });
    alcance.estaAsignado.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const solicitud = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      params: {},
      body: { programaId: 'prog-1' },
      user: { id: 'car', rol: RolUsuario.Cargador },
    };

    await expect(guard.canActivate(contextoDe(solicitud, {}))).resolves.toBe(true);
    await expect(guard.canActivate(contextoDe(solicitud, {}))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(alcance.estaAsignado).toHaveBeenCalledTimes(2);
  });
});
