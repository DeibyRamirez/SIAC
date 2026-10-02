import { CodigoDocumentoGuia, EstadoEvidencia, RolUsuario } from '@prisma/client';
import {
  combinarConAlcance,
  construirFiltrosConsultaEvidencias,
  construirOrdenConsultaEvidencias,
} from './constructor-consulta-evidencias';

describe('ConstructorConsultaEvidencias', () => {
  it('filtra por slug de programa y puntaje mínimo', () => {
    const where = construirFiltrosConsultaEvidencias({
      programaSlug: 'derecho',
      puntajeMin: 5,
    });

    expect(where).toEqual({
      AND: [
        { programa: { slug: 'derecho' } },
        { puntajeActual: { gte: 5 } },
      ],
    });
  });

  it('mapea semáforo Gris a puntaje nulo', () => {
    const where = construirFiltrosConsultaEvidencias({ semaforo: 'Gris' });
    expect(where).toEqual({ puntajeActual: null });
  });

  it('el texto libre incluye guía G3', () => {
    const where = construirFiltrosConsultaEvidencias({ busqueda: 'g3' });
    expect(where.OR).toContainEqual({ codigoGuia: CodigoDocumentoGuia.G3 });
  });

  it('usa ids FTS cuando se proveen', () => {
    const where = construirFiltrosConsultaEvidencias({
      idsFts: ['ev-1', 'ev-2'],
      busqueda: 'currículo',
    });
    expect(where).toEqual({ id: { in: ['ev-1', 'ev-2'] } });
  });

  it('ignora estado explícito para par académico', () => {
    const where = construirFiltrosConsultaEvidencias({
      estado: EstadoEvidencia.Borrador,
      rolUsuario: RolUsuario.ParAcademico,
    });
    expect(where).toEqual({});
  });

  it('combina alcance RN-001 con facetas', () => {
    const alcance = { autorId: 'car-1', programaId: { in: ['prog-1'] } };
    const facetas = construirFiltrosConsultaEvidencias({ puntajeMin: 5 });
    const final = combinarConAlcance(facetas, alcance);
    expect(final.AND).toHaveLength(2);
  });

  it('ordena por puntaje descendente', () => {
    expect(
      construirOrdenConsultaEvidencias({ orden: 'puntajeActual', direccion: 'desc' }),
    ).toEqual({ puntajeActual: 'desc' });
  });
});
