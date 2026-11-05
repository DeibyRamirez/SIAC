import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { TipoTramitePlantilla } from '@prisma/client';
import { crearPipeTipoTramite } from './tipo-tramite.pipe';

describe('crearPipeTipoTramite (filtro ?tipoTramite= de plantillas)', () => {
  const metadatos: ArgumentMetadata = { type: 'query', data: 'tipoTramite' };
  const pipe = crearPipeTipoTramite();

  it.each(Object.values(TipoTramitePlantilla))('acepta el valor del enum %s', async (valor) => {
    await expect(pipe.transform(valor, metadatos)).resolves.toBe(valor);
  });

  it('deja pasar el parámetro ausente (listado sin filtro)', async () => {
    await expect(pipe.transform(undefined, metadatos)).resolves.toBeUndefined();
  });

  it('rechaza un valor desconocido con 400 y mensaje en español', async () => {
    const promesa = pipe.transform('xyz', metadatos);
    await expect(promesa).rejects.toBeInstanceOf(BadRequestException);
    await expect(pipe.transform('xyz', metadatos)).rejects.toThrow(
      'tipoTramite no es válido. Valores permitidos: Renovacion, NuevoPrograma, General.',
    );
  });

  it('distingue mayúsculas: "renovacion" no es un valor válido', async () => {
    await expect(pipe.transform('renovacion', metadatos)).rejects.toBeInstanceOf(BadRequestException);
  });
});
