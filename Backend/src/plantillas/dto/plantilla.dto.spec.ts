import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CategoriaPlantilla,
  CodigoDocumentoGuia,
  FormatoArchivo,
  TipoTramitePlantilla,
} from '@prisma/client';
import { CrearPlantillaDto } from './plantilla.dto';

describe('CrearPlantillaDto (multipart)', () => {
  const base = {
    nombre: 'G1 — Documento Maestro de Programa',
    formato: FormatoArchivo.DOCX,
    version: '2026.1',
    categoria: CategoriaPlantilla.Programa,
    tipoTramite: TipoTramitePlantilla.General,
    codigoGuia: CodigoDocumentoGuia.G1,
  };

  it('acepta esGuiaDocumentoMaestro como string "true" desde FormData', async () => {
    const dto = plainToInstance(CrearPlantillaDto, {
      ...base,
      esGuiaDocumentoMaestro: 'true',
    });
    const errores = await validate(dto);
    expect(errores).toHaveLength(0);
    expect(dto.esGuiaDocumentoMaestro).toBe(true);
  });

  it('acepta nombre con guiones largos y tildes', async () => {
    const dto = plainToInstance(CrearPlantillaDto, {
      ...base,
      nombre: 'Guía de autoevaluación — programa',
    });
    const errores = await validate(dto);
    expect(errores).toHaveLength(0);
  });
});
