import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '@prisma/client';
import { MetricasController } from './metricas.controller';
import { ROLES_KEY, RolesGuard } from '../common/guards/roles.guard';

function contextoConRol(rol: RolUsuario): ExecutionContext {
  return {
    getHandler: () => MetricasController.prototype.obtenerToken,
    getClass: () => MetricasController,
    switchToHttp: () => ({ getRequest: () => ({ user: { rol } }) }),
  } as unknown as ExecutionContext;
}

describe('MetricasController · acceso a GET /metricas/token', () => {
  it('solo declara el rol Administrador (alineado con el frontend)', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, MetricasController) as RolUsuario[];
    expect(roles).toEqual([RolUsuario.Administrador]);
  });

  it('el Revisor recibe 403 (el guard rechaza) y el Administrador pasa', () => {
    const guard = new RolesGuard(new Reflector());

    expect(guard.canActivate(contextoConRol(RolUsuario.Revisor))).toBe(false);
    expect(guard.canActivate(contextoConRol(RolUsuario.Administrador))).toBe(true);
    expect(guard.canActivate(contextoConRol(RolUsuario.SuperAdmin))).toBe(true);
  });
});
