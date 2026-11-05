import { hashUrlPublicaPowerBi, prepararUrlPublicaPowerBiEntrada } from './powerbi-url.util';
import { analizarUrlInformePowerBi, clasificarUrlInformePowerBi } from './validar-url-informe';

const URL_VIEW = 'https://app.powerbi.com/view?r=tokenDePrueba';
const REPORT = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const CTID = '0f1e2d3c-4b5a-6978-8a7b-6c5d4e3f2a1b';
const GROUP = '12345678-1234-1234-1234-123456789abc';
const SEGURA = `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&autoAuth=true&ctid=${CTID}`;
const SEGURA_GRUPO = `https://app.powerbi.com/reportEmbed?groupId=${GROUP}&ctid=${CTID}&reportId=${REPORT}`;
const SEGURA_SIN_AUTH = `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&ctid=${CTID}`;

describe('prepararUrlPublicaPowerBiEntrada', () => {
  it('acepta URL reportEmbed directa', () => {
    expect(prepararUrlPublicaPowerBiEntrada(`  ${SEGURA}  `)).toBe(SEGURA);
    expect(clasificarUrlInformePowerBi(SEGURA)).toBe('seguro');
  });

  it('extrae reportEmbed desde iframe', () => {
    const iframe = `<iframe src="${SEGURA}" width="600"></iframe>`;
    expect(prepararUrlPublicaPowerBiEntrada(iframe)).toBe(SEGURA);
  });

  it('extrae reportEmbed aunque el iframe codifique &amp;', () => {
    const src = `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&amp;autoAuth=true&amp;ctid=${CTID}`;
    const iframe = `<iframe title="SIAC" src="${src}" frameborder="0"></iframe>`;
    expect(prepararUrlPublicaPowerBiEntrada(iframe)).toBe(SEGURA);
  });

  it('rechaza Publicar en la web (/view?r=)', () => {
    expect(prepararUrlPublicaPowerBiEntrada(URL_VIEW)).toBe('');
    expect(prepararUrlPublicaPowerBiEntrada(`<iframe src="${URL_VIEW}"></iframe>`)).toBe('');
  });

  it('no saca un enlace Power BI escondido en otra URL', () => {
    expect(
      prepararUrlPublicaPowerBiEntrada(`https://evil.com/?u=${encodeURIComponent(SEGURA)}`),
    ).toBe('');
  });

  it('rechaza el primer src si no es de Power BI', () => {
    const html = `<iframe src="javascript:alert(1)"></iframe><iframe src="${SEGURA}"></iframe>`;
    expect(prepararUrlPublicaPowerBiEntrada(html)).toBe('');
  });

  it('rechaza valores inválidos', () => {
    expect(prepararUrlPublicaPowerBiEntrada('https://ejemplo.com')).toBe('');
    expect(prepararUrlPublicaPowerBiEntrada('')).toBe('');
    expect(prepararUrlPublicaPowerBiEntrada(null)).toBe('');
  });
});

describe('analizarUrlInformePowerBi', () => {
  it.each([
    SEGURA,
    SEGURA_SIN_AUTH,
    SEGURA_GRUPO,
    `https://app.powerbi.com/reportEmbed?ctid=${CTID}&autoAuth=true&reportId=${REPORT}&groupId=${GROUP}`,
    `https://app.powerbi.com/reportEmbed?reportId=${REPORT.toUpperCase()}&ctid=${CTID.toUpperCase()}`,
  ])('acepta %s', (url) => {
    const analizada = analizarUrlInformePowerBi(url);
    expect(analizada?.url.toLowerCase()).toBe(url.toLowerCase());
    expect(analizada?.tipo).toBe('seguro');
  });

  it.each([
    '',
    '   ',
    URL_VIEW,
    'https://app.powerbi.com/view?r=eyJrIjoiLi4uIn0',
    'HTTPS://app.powerbi.com/view?r=abc',
    'http://app.powerbi.com/view?r=abc',
    'http://app.powerbi.com/reportEmbed?reportId=' + REPORT + '&ctid=' + CTID,
    'javascript:alert(1)',
    'javascript:https://app.powerbi.com/view?r=abc',
    'data:text/html,hola',
    'ftp://app.powerbi.com/view?r=abc',
    '//app.powerbi.com/view?r=abc',
    'https://app.powerbi.com.evil.com/view?r=abc',
    'https://app.powerbi.com.evil.com/reportEmbed?reportId=' + REPORT + '&ctid=' + CTID,
    'https://evil.app.powerbi.com/view?r=abc',
    'https://evil.com/view?r=abc',
    'https://evil.com/?u=https://app.powerbi.com/view?r=abc',
    'https://user:pass@app.powerbi.com/view?r=abc',
    'https://app.powerbi.com@evil.com/view?r=abc',
    'https://app.powerbi.com:443/view?r=abc',
    'https://app.powerbi.com:8443/view?r=abc',
    'https://app.powerbi.com:8443/reportEmbed?reportId=' + REPORT + '&ctid=' + CTID,
    'https://app.powerbi.com/view?r=',
    'https://app.powerbi.com/view?r=%20',
    'https://app.powerbi.com/view',
    'https://app.powerbi.com/view/',
    'https://app.powerbi.com/view?r=abc&otro=1',
    'https://app.powerbi.com/view?r=abc#frag',
    'https://app.powerbi.com//view?r=abc',
    'https://app.powerbi.com/view/../view?r=abc',
    'https://app.powerbi.com/reportEmbed?reportId=abc',
    'https://app.powerbi.com/reportEmbed?reportId=' + REPORT,
    'https://app.powerbi.com/reportEmbed?reportId=' + REPORT + '&ctid=no-es-guid',
    'https://app.powerbi.com/reportEmbed?reportId=' + REPORT + '&ctid=common',
    'https://app.powerbi.com/reportEmbed?reportId={' + REPORT + '}&ctid=' + CTID,
    SEGURA + '&filter=1',
    SEGURA + '&autoAuth=false',
    `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&ctid=${CTID}&autoAuth=false`,
    `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&ctid=${CTID}&autoAuth=TRUE`,
    `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&ctid=${CTID}&autoAuth=`,
    `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&ctid=${CTID}&groupId=`,
    `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&ctid=${CTID}&groupId=no`,
    `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&ctid=${CTID}&reportId=${REPORT}`,
    'https://app.powerbi.com/ReportEmbed?reportId=' + REPORT + '&ctid=' + CTID,
    'https://app.powerbi.com/reportEmbed/extra?reportId=' + REPORT + '&ctid=' + CTID,
    'https://login.microsoftonline.com/reportEmbed?reportId=' + REPORT + '&ctid=' + CTID,
    'https://app.powerbi.com/otro?r=abc',
    'https://app.powerbi.com/view?r=abc\\nevil',
  ])('rechaza %s', (url) => {
    expect(analizarUrlInformePowerBi(url)).toBeNull();
  });
});

describe('hashUrlPublicaPowerBi', () => {
  it('genera hash estable', () => {
    const a = hashUrlPublicaPowerBi(SEGURA);
    const b = hashUrlPublicaPowerBi(SEGURA);
    expect(a).toBe(b);
    expect(a.length).toBe(64);
    expect(hashUrlPublicaPowerBi(SEGURA_SIN_AUTH)).not.toBe(a);
  });
});
