import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsuarioRepositorio } from '../usuarios/usuario.repositorio';
import { RolUsuario } from '@prisma/client';
import { contextoRlsActual, ejecutarConContextoVacio } from '../prisma/contexto-rls';

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
            buscarParaLogin: jest.fn(),
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

    usuarioRepo.buscarParaLogin.mockResolvedValue({
      id: 'usr-1',
      codigoInstitucional: null,
      nombre: 'María Cortés',
      correo: 'maria.cargadora@uniautonoma.edu.co',
      contrasena: 'hash-almacenado',
      cargo: null,
      dependencia: null,
      rol: RolUsuario.Cargador,
      responsableProcesoInstitucional: false,
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

  it('no emite token a un usuario inactivo aunque la contraseña sea correcta', async () => {
    usuarioRepo.buscarParaLogin.mockResolvedValueOnce({
      id: 'usr-2',
      nombre: 'Inactiva',
      correo: 'inactiva@uniautonoma.edu.co',
      contrasena: 'hash',
      rol: RolUsuario.Cargador,
      activo: false,
      responsableProcesoInstitucional: false,
    });

    await expect(
      authService.iniciarSesion({ correo: 'inactiva@uniautonoma.edu.co', contrasena: 'Cargador2026' }),
    ).rejects.toThrow('Usuario inactivo');
  });

  it('tras el login fija el usuario en el contexto de RLS de la petición', async () => {
    await ejecutarConContextoVacio(async () => {
      await authService.iniciarSesion({
        correo: 'maria.cargadora@uniautonoma.edu.co',
        contrasena: 'Cargador2026',
      });
      expect(contextoRlsActual()).toEqual({ usuarioId: 'usr-1', rol: RolUsuario.Cargador });
    });
  });
});
