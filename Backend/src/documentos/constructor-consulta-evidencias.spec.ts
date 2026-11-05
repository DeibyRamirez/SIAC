import { EstadoEvidencia, RolUsuario } from '@prisma/client';
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

  it('aplica condicionTextoLibre cuando se provee', () => {
    const condicion = { OR: [{ id: { in: ['ev-1', 'ev-2'] } }] };
    const where = construirFiltrosConsultaEvidencias({
      condicionTextoLibre: condicion,
    });
    expect(where).toEqual(condicion);
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
