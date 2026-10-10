import {
  esUrlImagenValida,
  generarCodigoPrograma,
  mapearCarreraExterna,
  mapearCarrerasExternas,
  parsearDuracionSemestres,
  resolverUrlImagenCarrera,
} from './mapear-carrera-externa';

describe('mapear-carrera-externa', () => {
  const carreraBase = {
    _id: '68f01b83144b6d49ae7cdd0b',
    titulo: 'Administración de Empresas',
    modalidad: 'Presencial',
    duracion: '9 semestres',
    imagen: 'administracion',
    descripcion: 'No importar',
    facultad: 'Facultad de Ciencias Administrativas',
    activo: true,
    videoUrl: 'https://youtube.com/watch?v=x',
    imagenR: 'administracion',
  };

  it('parsea duración en semestres', () => {
    expect(parsearDuracionSemestres('9 semestres')).toBe(9);
    expect(parsearDuracionSemestres('10 semestres')).toBe(10);
    expect(parsearDuracionSemestres('')).toBeUndefined();
  });

  it('rechaza imagen relativa y acepta URL absoluta', () => {
    expect(esUrlImagenValida('administracion')).toBe(false);
    expect(esUrlImagenValida('http://localhost:3000/derecho.png')).toBe(true);
  });

  it('prioriza urlImagen de la API y reescribe localhost con base configurada', () => {
    expect(
      resolverUrlImagenCarrera(
        {
          urlImagen: 'https://cdn.ejemplo.edu/carreras/administracion.png',
          imagen: 'administracion',
        },
        'https://sitio-cuac.vercel.app',
      ),
    ).toBe('https://cdn.ejemplo.edu/carreras/administracion.png');

    expect(
      resolverUrlImagenCarrera(
        {
          urlImagen: null,
          imagen: 'http://localhost:3000/Carreras/contaduria.png',
        },
        'https://sitio-cuac.vercel.app',
      ),
    ).toBe('https://sitio-cuac.vercel.app/Carreras/contaduria.png');
  });

  it('convierte slug de imagen en ruta /Carreras/{slug}.png', () => {
    expect(resolverUrlImagenCarrera({ imagen: 'administracion' })).toBe(
      '/Carreras/administracion.png',
    );
    expect(
      resolverUrlImagenCarrera({ imagen: 'administracion' }, 'https://sitio-cuac.vercel.app'),
    ).toBe('https://sitio-cuac.vercel.app/Carreras/administracion.png');
  });

  it('genera código desde el título', () => {
    expect(generarCodigoPrograma('Administración de Empresas')).toBe('ADM-EMP');
  });

  it('mapea solo campos de catálogo SIAC', () => {
    const mapeado = mapearCarreraExterna(carreraBase, {
      baseImagenes: 'https://sitio-cuac.vercel.app',
    });
    expect(mapeado).toEqual({
      idExterno: '68f01b83144b6d49ae7cdd0b',
      codigo: 'ADM-EMP',
      nombre: 'Administración de Empresas',
      slug: 'administracion-de-empresas',
      nivel: 'Pregrado',
      modalidad: 'Presencial',
      facultad: 'Facultad de Ciencias Administrativas',
      duracionSemestres: 9,
      urlImagen: 'https://sitio-cuac.vercel.app/Carreras/administracion.png',
      activo: true,
    });
  });

  it('usa urlImagen de la API cuando viene informada', () => {
    const mapeado = mapearCarreraExterna({
      ...carreraBase,
      urlImagen: 'https://cdn.ejemplo.edu/administracion.png',
      imagen: 'administracion',
    });
    expect(mapeado?.urlImagen).toBe('https://cdn.ejemplo.edu/administracion.png');
  });

  it('resuelve colisiones de código entre carreras', () => {
    const carreras = mapearCarrerasExternas([
      { _id: '1', titulo: 'Derecho', activo: true },
      { _id: '2', titulo: 'Derecho', activo: true },
    ]);
    expect(carreras).toHaveLength(2);
    expect(carreras[0].codigo).not.toBe(carreras[1].codigo);
  });

  it('resuelve colisiones de slug entre carreras', () => {
    const carreras = mapearCarrerasExternas([
      { _id: 'aaa111', titulo: 'Derecho', activo: true },
      { _id: 'bbb222', titulo: 'Derecho', activo: true },
    ]);
    expect(carreras[0].slug).not.toBe(carreras[1].slug);
  });

  it('ignora carreras sin título o id', () => {
    expect(mapearCarreraExterna({ _id: '', titulo: 'X' })).toBeNull();
    expect(mapearCarreraExterna({ _id: 'abc', titulo: '' })).toBeNull();
  });
});
