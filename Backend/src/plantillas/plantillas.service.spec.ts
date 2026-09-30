import {
  CategoriaPlantilla,
  CodigoDocumentoGuia,
  FormatoArchivo,
  TipoTramitePlantilla,
} from '@prisma/client';
import { PlantillasService } from './plantillas.service';
import { PlantillaRepositorio } from './plantilla.repositorio';

describe('PlantillasService versionado HU-005', () => {
  const plantillaRepo = {
    marcarAnterioresNoVigentes: jest.fn(),
    crear: jest.fn(),
  };
  const servicio = new PlantillasService(
    plantillaRepo as unknown as PlantillaRepositorio,
    {} as never,
  );

  const dtoBase = {
    nombre: 'Documento maestro',
    formato: FormatoArchivo.DOCX,
    version: '2.0',
    categoria: CategoriaPlantilla.Programa,
    codigoGuia: CodigoDocumentoGuia.G1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    plantillaRepo.crear.mockResolvedValue({ id: 'plt-1' });
  });

  it('una plantilla nueva desactiva las vigentes de la misma guía y trámite', async () => {
    await servicio.crear({ ...dtoBase, tipoTramite: TipoTramitePlantilla.Renovacion });

    expect(plantillaRepo.marcarAnterioresNoVigentes).toHaveBeenCalledWith(
      CodigoDocumentoGuia.G1,
      TipoTramitePlantilla.Renovacion,
    );
  });

  it('sin tipo de trámite versiona dentro de General', async () => {
    await servicio.crear(dtoBase);

    expect(plantillaRepo.marcarAnterioresNoVigentes).toHaveBeenCalledWith(
      CodigoDocumentoGuia.G1,
      TipoTramitePlantilla.General,
    );
  });
});
