import 'reflect-metadata';

import { validate } from 'class-validator';

import { ActualizarInformePowerBiDto } from './actualizar-informe-powerbi.dto';

const REPORT = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const CTID = '0f1e2d3c-4b5a-6978-8a7b-6c5d4e3f2a1b';
const SEGURA = `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&autoAuth=true&ctid=${CTID}`;

async function mensajes(url: string): Promise<string[]> {
  const dto = new ActualizarInformePowerBiDto();
  dto.urlPublica = url;
  const errores = await validate(dto);
  return errores.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('ActualizarInformePowerBiDto', () => {
  it('acepta view, reportEmbed y el iframe pegado', async () => {
    expect(await mensajes('https://app.powerbi.com/view?r=token')).toEqual([]);
    expect(await mensajes(SEGURA)).toEqual([]);
    expect(
      await mensajes(`<iframe src="${SEGURA.replace(/&/g, '&amp;')}"></iframe>`),
    ).toEqual([]);
  });

  it.each([
    '',
    'javascript:alert(1)',
    'https://evil.com/view?r=abc',
    'https://app.powerbi.com:443/view?r=abc',
    'https://user@app.powerbi.com/view?r=abc',
    `https://app.powerbi.com/reportEmbed?reportId=${REPORT}`,
    `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&ctid=${CTID}&autoAuth=false`,
  ])('rechaza %s', async (url) => {
    const lista = await mensajes(url);
    expect(lista.length).toBeGreaterThan(0);
    expect(lista.join(' ')).toMatch(/view\?r=|reportEmbed|vacío|no debe estar vacío/i);
  });
});
