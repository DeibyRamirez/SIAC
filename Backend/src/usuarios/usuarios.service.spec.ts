import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RolUsuario } from '@prisma/client';
import { UsuariosService } from './usuarios.service';
import { UsuarioRepositorio } from './usuario.repositorio';

describe('UsuariosService.actualizarRol', () => {
  const usuarioRepo = {
    buscarPorId: jest.fn(),
    actualizarRol: jest.fn(),
  };
  const servicio = new UsuariosService(
    usuarioRepo as unknown as UsuarioRepositorio,
    { get: jest.fn() } as unknown as ConfigService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('impide que un administrador asigne SuperAdmin', async () => {
    usuarioRepo.buscarPorId.mockResolvedValue({ id: 'u1', rol: RolUsuario.Revisor });

    await expect(
      servicio.actualizarRol(
        { id: 'admin', rol: RolUsuario.Administrador },
        'u1',
        RolUsuario.SuperAdmin,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(usuarioRepo.actualizarRol).not.toHaveBeenCalled();
  });

  it('impide que un administrador modifique a un SuperAdmin', async () => {
    usuarioRepo.buscarPorId.mockResolvedValue({ id: 'sa', rol: RolUsuario.SuperAdmin });

    await expect(
      servicio.actualizarRol(
        { id: 'admin', rol: RolUsuario.Administrador },
        'sa',
        RolUsuario.Revisor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('permite que el superadmin asigne SuperAdmin', async () => {
    usuarioRepo.buscarPorId.mockResolvedValue({ id: 'u1', rol: RolUsuario.Administrador });
    usuarioRepo.actualizarRol.mockResolvedValue({
      id: 'u1',
      rol: RolUsuario.SuperAdmin,
      contrasena: 'secreto',
      nombre: 'Ana',
    });

    const resultado = await servicio.actualizarRol(
      { id: 'sa', rol: RolUsuario.SuperAdmin },
      'u1',
      RolUsuario.SuperAdmin,
    );

    expect(resultado).toMatchObject({ id: 'u1', rol: RolUsuario.SuperAdmin });
    expect(resultado).not.toHaveProperty('contrasena');
  });
});
