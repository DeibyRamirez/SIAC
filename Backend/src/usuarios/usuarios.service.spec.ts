import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RolUsuario } from '@prisma/client';
import { UsuariosService } from './usuarios.service';
import { UsuarioRepositorio } from './usuario.repositorio';

describe('UsuariosService.actualizarRol', () => {
  const usuarioRepo = {
    buscarPorId: jest.fn(),
    actualizarRol: jest.fn(),
    actualizarAlcanceInstitucional: jest.fn(),
  };
  const servicio = new UsuariosService(
    usuarioRepo as unknown as UsuarioRepositorio,
    { get: jest.fn() } as unknown as ConfigService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('impide que un administrador cambie cualquier rol', async () => {
    usuarioRepo.buscarPorId.mockResolvedValue({ id: 'u1', rol: RolUsuario.Revisor });

    await expect(
      servicio.actualizarRol(
        { id: 'admin', rol: RolUsuario.Administrador },
        'u1',
        RolUsuario.Cargador,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(usuarioRepo.actualizarRol).not.toHaveBeenCalled();
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

describe('UsuariosService.asignarAlcanceInstitucional', () => {
  const usuarioRepo = {
    buscarPorId: jest.fn(),
    actualizarAlcanceInstitucional: jest.fn(),
  };
  const servicio = new UsuariosService(
    usuarioRepo as unknown as UsuarioRepositorio,
    { get: jest.fn() } as unknown as ConfigService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('rechaza asignación a administrador', async () => {
    usuarioRepo.buscarPorId.mockResolvedValue({
      id: 'admin',
      rol: RolUsuario.Administrador,
    });

    await expect(servicio.asignarAlcanceInstitucional('admin', true)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('permite asignar a cargador', async () => {
    usuarioRepo.buscarPorId.mockResolvedValue({
      id: 'car',
      rol: RolUsuario.Cargador,
    });
    usuarioRepo.actualizarAlcanceInstitucional.mockResolvedValue({
      id: 'car',
      responsableProcesoInstitucional: true,
    });

    const resultado = await servicio.asignarAlcanceInstitucional('car', true);
    expect(resultado.datos.responsableProcesoInstitucional).toBe(true);
  });
});
