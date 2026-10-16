import { hashUrlPublicaPowerBi, prepararUrlPublicaPowerBiEntrada } from './powerbi-url.util';

const URL = 'https://app.powerbi.com/view?r=tokenDePrueba';

describe('prepararUrlPublicaPowerBiEntrada', () => {
  it('acepta URL directa', () => {
    expect(prepararUrlPublicaPowerBiEntrada(URL)).toBe(URL);
  });

  it('extrae URL desde iframe', () => {
    const iframe = `<iframe src="${URL}" width="600"></iframe>`;
    expect(prepararUrlPublicaPowerBiEntrada(iframe)).toBe(URL);
  });

  it('rechaza valores inválidos', () => {
    expect(prepararUrlPublicaPowerBiEntrada('https://ejemplo.com')).toBe('');
  });
});

describe('hashUrlPublicaPowerBi', () => {
  it('genera hash estable', () => {
    const a = hashUrlPublicaPowerBi(URL);
    const b = hashUrlPublicaPowerBi(URL);
    expect(a).toBe(b);
    expect(a.length).toBe(64);
  });
});
