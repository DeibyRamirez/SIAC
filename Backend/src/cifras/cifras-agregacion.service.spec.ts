import { FuenteCifra } from '@prisma/client';
import { CifrasAgregacionService } from './cifras-agregacion.service';
import { CifrasRegistrosRepositorio } from './cifras-registros.repositorio';
import { CifrasRepositorio } from './cifras.repositorio';

class RegistrosFalso {
  periodos: Record<string, string[]> = { profesores: ['2023-2'] };
  facultades: Record<string, string[]> = {
    profesores: [
      'Facultad de Ciencias Agrarias',
      'Facultad de Ciencias de la Salud',
    ],
    infraestructura: [],
  };
  programas: Record<string, string[]> = {
    profesores: ['Ingeniería Agropecuaria', 'Medicina'],
    infraestructura: [],
  };
  sedes: Record<string, string[]> = { infraestructura: ['Claustro El Carmen'] };
  filas: Array<Record<string, unknown>> = [];
  llamadasConsultar: Array<Record<string, unknown>> = [];
  llamadasProgramas: Array<{ categoriaId: string; facultad?: string }> = [];

  async listarPeriodos(categoriaId: string): Promise<string[]> {
    return this.periodos[categoriaId] ?? [];
  }

  async listarFacultades(categoriaId: string): Promise<string[]> {
    return this.facultades[categoriaId] ?? [];
  }

  async listarProgramas(
    categoriaId: string,
    opciones: { periodo?: string; facultad?: string } = {},
  ): Promise<string[]> {
    this.llamadasProgramas.push({ categoriaId, facultad: opciones.facultad });
    if (opciones.facultad) {
      return (this.programas[categoriaId] ?? []).filter((programa) =>
        opciones.facultad?.includes('Salud') ? programa === 'Medicina' : true,
      );
    }
    return this.programas[categoriaId] ?? [];
  }

  async listarSedes(categoriaId: string): Promise<string[]> {
    return this.sedes[categoriaId] ?? [];
  }

  async consultar(
    categoriaId: string,
    filtros: Record<string, unknown>,
  ): Promise<Array<Record<string, unknown>>> {
    this.llamadasConsultar.push({ categoriaId, ...filtros });
    return this.filas;
  }

  async resolverNombrePrograma(): Promise<string | null> {
    return null;
  }
}

class RepositorioCifrasFalso {
  async ultimaCarga() {
    return {
      fuente: FuenteCifra.EXCEL,
      createdAt: new Date('2026-10-12T10:00:00.000Z'),
    };
  }

  async listarPeriodos() {
    return [];
  }
}

function crearServicio(registros: RegistrosFalso): CifrasAgregacionService {
  return new CifrasAgregacionService(
    registros as unknown as CifrasRegistrosRepositorio,
    new RepositorioCifrasFalso() as unknown as CifrasRepositorio,
  );
}

const FILA_PROFESOR = {
  programa: 'Ingeniería Agropecuaria',
  genero: 'Femenino',
  facultad: 'Facultad de Ciencias Agrarias',
  periodo_inicio: '2018-1',
  periodo_final: null,
  periodo_academico: '2023-2',
  estrato: 2,
};

describe('CifrasAgregacionService — filtros y sin coincidencias', () => {
  it('una facultad inexistente no es «sin datos»: sinCoincidencias y periodos disponibles poblados', async () => {
    const registros = new RegistrosFalso();
    const servicio = crearServicio(registros);

    const respuesta = await servicio.obtenerCategoria('profesores', '2023-2', {
      facultad: 'Facultad de Ciencias Ambientales y Desarrollo Sostenible',
    });

    expect(respuesta).not.toBeNull();
    expect(respuesta?.meta.sinCoincidencias).toBe(true);
    expect(respuesta?.meta.fuente).toBe('EXCEL');
    expect(respuesta?.meta.periodo).toBe('2023-2');
    expect(respuesta?.periodosDisponibles).toEqual(['2023-2']);
    expect(respuesta?.indicadores).toEqual([]);
    expect(registros.llamadasConsultar).toHaveLength(0);
  });

  it('resuelve facultad/programa sin distinguir mayúsculas ni tildes y consulta con el valor exacto', async () => {
    const registros = new RegistrosFalso();
    registros.filas = [FILA_PROFESOR];
    const servicio = crearServicio(registros);

    const respuesta = await servicio.obtenerCategoria('profesores', '2023-2', {
      facultad: 'facultad de ciencias agrarias',
      programa: 'ingenieria agropecuaria',
    });

    expect(respuesta?.meta.sinCoincidencias).toBeUndefined();
    expect(respuesta?.indicadores.length).toBeGreaterThan(0);
    expect(registros.llamadasConsultar[0]).toMatchObject({
      periodo: '2023-2',
      facultad: 'Facultad de Ciencias Agrarias',
      programa: 'Ingeniería Agropecuaria',
    });
  });

  it('un periodo sin datos en la categoría también marca sinCoincidencias sin perder los periodos', async () => {
    const registros = new RegistrosFalso();
    const servicio = crearServicio(registros);

    const respuesta = await servicio.obtenerCategoria('profesores', '2024-1');

    expect(respuesta?.meta.sinCoincidencias).toBe(true);
    expect(respuesta?.meta.periodo).toBe('2024-1');
    expect(respuesta?.periodosDisponibles).toEqual(['2023-2']);
    expect(registros.llamadasConsultar[0]).toMatchObject({ periodo: '2024-1' });
  });

  it('sin registros en la categoría devuelve null (el proveedor decide el respaldo)', async () => {
    const registros = new RegistrosFalso();
    registros.periodos = { profesores: [] };
    const servicio = crearServicio(registros);

    expect(await servicio.obtenerCategoria('profesores')).toBeNull();
  });

  it('GET /filtros entrega valores distintos reales y programas dependientes de la facultad', async () => {
    const registros = new RegistrosFalso();
    const servicio = crearServicio(registros);

    const generales = await servicio.obtenerFiltros('profesores');
    expect(generales.periodos).toEqual(['2023-2']);
    expect(generales.facultades).toEqual([
      'Facultad de Ciencias Agrarias',
      'Facultad de Ciencias de la Salud',
    ]);
    expect(generales.programas).toEqual(['Ingeniería Agropecuaria', 'Medicina']);
    expect(generales.sedes).toEqual([]);

    const porFacultad = await servicio.obtenerFiltros('profesores', {
      facultad: 'Facultad de Ciencias de la Salud',
    });
    expect(porFacultad.programas).toEqual(['Medicina']);
    expect(registros.llamadasProgramas.at(-1)).toMatchObject({
      categoriaId: 'profesores',
      facultad: 'Facultad de Ciencias de la Salud',
    });

    const inexistente = await servicio.obtenerFiltros('profesores', {
      facultad: 'Facultad Inexistente',
    });
    expect(inexistente.programas).toEqual([]);
  });

  it('infraestructura devuelve sedes y deja vacíos facultades/programas/periodos', async () => {
    const registros = new RegistrosFalso();
    const servicio = crearServicio(registros);

    const filtros = await servicio.obtenerFiltros('infraestructura');

    expect(filtros).toEqual({
      periodos: [],
      facultades: [],
      programas: [],
      sedes: ['Claustro El Carmen'],
    });
  });
});
