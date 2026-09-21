import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsuarioRepositorio } from '../usuarios/usuario.repositorio';
import { RolUsuario } from '@prisma/client';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let authService: AuthService;
  let usuarioRepo: jest.Mocked<UsuarioRepositorio>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsuarioRepositorio,
          useValue: {
            buscarPorCorreo: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('token-jwt-test'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'DOMINIO_INSTITUCIONAL') return 'uniautonoma.edu.co';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    usuarioRepo = module.get(UsuarioRepositorio);

    usuarioRepo.buscarPorCorreo.mockResolvedValue({
      id: 'usr-1',
      codigoInstitucional: null,
      nombre: 'María Cortés',
      correo: 'maria.cargadora@uniautonoma.edu.co',
      contrasena: 'hash-almacenado',
      cargo: null,
      dependencia: null,
      rol: RolUsuario.Cargador,
      activo: true,
      idExterno: null,
      origenDato: 'Manual',
      fechaSincronizacion: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    (bcrypt.compare as jest.Mock).mockImplementation(
      (plain: string) => Promise.resolve(plain === 'Cargador2026'),
    );
  });

  it('debe emitir JWT con credenciales válidas', async () => {
    const resultado = await authService.iniciarSesion({
      correo: 'maria.cargadora@uniautonoma.edu.co',
      contrasena: 'Cargador2026',
    });

    expect(resultado.token).toBe('token-jwt-test');
    expect(resultado.usuario.rol).toBe(RolUsuario.Cargador);
  });

  it('debe rechazar correo fuera del dominio institucional', async () => {
    await expect(
      authService.iniciarSesion({
        correo: 'usuario@gmail.com',
        contrasena: 'test1234',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('debe rechazar credenciales inválidas', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      authService.iniciarSesion({
        correo: 'maria.cargadora@uniautonoma.edu.co',
        contrasena: 'incorrecta',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
