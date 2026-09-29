import { NotFoundException } from '@nestjs/common';
import { TipoTramiteSIAC } from '@prisma/client';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { InstitucionesService } from './instituciones.service';
import { InstitucionRepositorio } from './institucion.repositorio';
import { ActualizarInstitucionDto } from './dto/actualizar-institucion.dto';

describe('InstitucionesService (HU-010)', () => {
  const repo = {
    listar: jest.fn(),
    buscarPorId: jest.fn(),
    buscarPorSigla: jest.fn(),
    buscarPrimera: jest.fn(),
    actualizar: jest.fn(),
  };
  const servicio = new InstitucionesService(repo as unknown as InstitucionRepositorio);

  beforeEach(() => jest.clearAllMocks());

  it('la institución principal es la CUAC', async () => {
    repo.buscarPorSigla.mockResolvedValue({ id: 'institucion-cuac', sigla: 'CUAC' });
    await expect(servicio.obtenerPrincipal()).resolves.toMatchObject({ sigla: 'CUAC' });
    expect(repo.buscarPorSigla).toHaveBeenCalledWith('CUAC');
  });

  it('sin institución registrada responde 404', async () => {
    repo.buscarPorSigla.mockResolvedValue(null);
    repo.buscarPrimera.mockResolvedValue(null);
    await expect(servicio.obtenerPrincipal()).rejects.toBeInstanceOf(NotFoundException);
  });

  it('actualiza nombre, sigla en mayúsculas y trámite institucional', async () => {
    repo.buscarPorId.mockResolvedValue({ id: 'institucion-cuac' });
    await servicio.actualizar('institucion-cuac', {
      sigla: ' cuac ',
      tipoTramiteActivo: TipoTramiteSIAC.CondicionesInstitucionalesNuevas,
    });
    expect(repo.actualizar).toHaveBeenCalledWith('institucion-cuac', {
      sigla: 'CUAC',
      tipoTramiteActivo: TipoTramiteSIAC.CondicionesInstitucionalesNuevas,
    });
  });

  it('el DTO rechaza un trámite de programa para la institución', async () => {
    const dto = plainToInstance(ActualizarInstitucionDto, {
      tipoTramiteActivo: TipoTramiteSIAC.RenovacionRegistroCalificado,
    });
    const errores = await validate(dto);
    expect(errores).toHaveLength(1);
    expect(errores[0].property).toBe('tipoTramiteActivo');
  });
});
