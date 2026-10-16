import { CodigoDocumentoGuia, EstadoEvidencia } from '@prisma/client';
import {
  combinarCondicionTextoLibre,
  construirFiltroTextoLibre,
} from './texto-libre-evidencias';

describe('texto-libre-evidencias', () => {
  it('soft coincide con nombre de programa', () => {
    const where = construirFiltroTextoLibre('soft');
    expect(where.OR).toContainEqual({
      programa: {
        OR: [
          { nombre: { contains: 'soft', mode: 'insensitive' } },
          { slug: { contains: 'soft', mode: 'insensitive' } },
          { codigo: { contains: 'soft', mode: 'insensitive' } },
        ],
      },
    });
  });

  it('admin coincide con programa por subcadena', () => {
    const where = construirFiltroTextoLibre('admin');
    expect(where.OR).toContainEqual({
      programa: {
        OR: expect.arrayContaining([
          { nombre: { contains: 'admin', mode: 'insensitive' } },
        ]),
      },
    });
  });

  it('observ filtra estados ConObservaciones', () => {
    const where = construirFiltroTextoLibre('observ');
    expect(where.OR).toContainEqual({
      estado: { in: [EstadoEvidencia.ConObservaciones] },
    });
  });

  it('g3 filtra por código de guía', () => {
    const where = construirFiltroTextoLibre('g3');
    expect(where.OR).toContainEqual({
      codigoGuia: { in: [CodigoDocumentoGuia.G3] },
    });
  });

  it('8/9 filtra puntaje y total de condiciones', () => {
    const where = construirFiltroTextoLibre('8/9');
    expect(where.OR).toContainEqual({
      AND: [{ puntajeActual: 8 }, { totalCondicionesActual: 9 }],
    });
  });

  it('combina FTS con texto libre', () => {
    const textoLibre = construirFiltroTextoLibre('soft');
    const combinado = combinarCondicionTextoLibre(['ev-1'], textoLibre);
    expect(combinado.OR).toEqual([
      { id: { in: ['ev-1'] } },
      textoLibre,
    ]);
  });

  it('sin ids FTS devuelve solo texto libre', () => {
    const textoLibre = construirFiltroTextoLibre('admin');
    expect(combinarCondicionTextoLibre([], textoLibre)).toEqual(textoLibre);
  });
});
