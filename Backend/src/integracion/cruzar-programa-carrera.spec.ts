import { AlcanceTramiteSIAC, TipoTramiteSIAC } from '@prisma/client';
import {
  buscarCarreraParaPrograma,
  construirIndiceCarreras,
  enriquecerFilaPanelConCarrera,
  extraerMetadatosCatalogo,
  filtrarFilasPorCatalogo,
  normalizarTextoCruce,
} from './cruzar-programa-carrera';
import type { CarreraExternaDto } from './mapear-carrera-externa';

describe('cruzar-programa-carrera', () => {
  const carrera: CarreraExternaDto = {
    _id: '1',
    codigoCu: 'CU027',
    codigoSnies: '19828',
    titulo: 'Administración de Empresas',
    nivel: 'Pregrado',
    modalidad: 'Presencial',
    facultad: 'Facultad de Ciencias Administrativas',
    duracion: '9 semestres',
    creditos: 175,
    resolucion: '9941',
    fechaResolucion: '2020-06-17',
    imagen: 'administracion',
    activo: true,
  };

  it('normaliza títulos para cruce', () => {
    expect(normalizarTextoCruce('Administración de Empresas')).toBe('administracion de empresas');
  });

  it('prioriza codigoSnies, luego codigoCu y luego título', () => {
    const indice = construirIndiceCarreras([carrera]);
    expect(buscarCarreraParaPrograma({ id: 'p1', nombre: 'Otro', codigoSnies: '19828' }, indice)).toBe(
      carrera,
    );
    expect(
      buscarCarreraParaPrograma({ id: 'p2', nombre: 'Otro', codigo: 'CU027' }, indice),
    ).toBe(carrera);
    expect(
      buscarCarreraParaPrograma({ id: 'p3', nombre: 'Administración de Empresas' }, indice),
    ).toBe(carrera);
  });

  it('enriquece fila con datos del catálogo e imagen resuelta', () => {
    const filaBase = {
      id: 'p1',
      nombre: 'ADM',
      codigo: 'ADM',
      alcance: AlcanceTramiteSIAC.Programa,
      tipoTramite: TipoTramiteSIAC.RenovacionRegistroCalificado,
      avancePorcentual: 0,
      semaforoAvance: 'Rojo' as const,
      semaforoVigencia: 'SinVigencia' as const,
      semaforoGeneral: 'Rojo' as const,
      documentos: [],
      anexoInfraestructuraVencido: false,
      fechaResolucion: null,
      fechaFinVigencia: null,
      semestre: null,
    };

    const enriquecida = enriquecerFilaPanelConCarrera(
      filaBase,
      { id: 'p1', nombre: 'ADM', codigo: 'CU027' },
      carrera,
      'https://sitio-cuac.vercel.app',
    );

    expect(enriquecida.tituloCatalogo).toBe('Administración de Empresas');
    expect(enriquecida.creditos).toBe(175);
    expect(enriquecida.urlImagen).toBe('https://sitio-cuac.vercel.app/Carreras/administracion.png');
    expect(enriquecida.imagenSlug).toBe('administracion');
  });

  it('filtra por nivel, facultad y modalidad', () => {
    const filas = [
      { id: '1', nivel: 'Pregrado', facultad: 'A', modalidad: 'Presencial' },
      { id: '2', nivel: 'Posgrado', facultad: 'B', modalidad: 'Virtual' },
    ] as Parameters<typeof filtrarFilasPorCatalogo>[0];

    const filtradas = filtrarFilasPorCatalogo(filas, { nivel: 'Pregrado', modalidad: 'Presencial' });
    expect(filtradas).toHaveLength(1);
    expect(filtradas[0].id).toBe('1');
  });

  it('extrae metadatos de catálogo para filtros', () => {
    const meta = extraerMetadatosCatalogo([carrera], '2026-2');
    expect(meta.version).toBe('2026-2');
    expect(meta.niveles).toContain('Pregrado');
    expect(meta.modalidades).toContain('Presencial');
  });
});
