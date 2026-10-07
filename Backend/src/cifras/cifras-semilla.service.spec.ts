import { Test, TestingModule } from '@nestjs/testing';
import { CifrasSemillaService } from './cifras-semilla.service';
import { FormatoIndicador, TipoSerieCifras } from './dto/cifras.dto';

describe('CifrasSemillaService', () => {
  let servicio: CifrasSemillaService;

  beforeEach(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      providers: [CifrasSemillaService],
    }).compile();

    servicio = modulo.get(CifrasSemillaService);
  });

  it('lista categorías con solo estudiantes disponible', () => {
    const { categorias } = { categorias: servicio.listarCategorias() };
    expect(categorias.some((c) => c.id === 'estudiantes' && c.disponible)).toBe(true);
    expect(categorias.filter((c) => c.disponible)).toHaveLength(1);
  });

  it('devuelve payload de estudiantes con indicadores y series', async () => {
    const respuesta = await servicio.obtenerPorCategoria('estudiantes');
    expect(respuesta.meta.categoriaId).toBe('estudiantes');
    expect(respuesta.indicadores.length).toBeGreaterThan(0);
    expect(respuesta.series.length).toBeGreaterThan(0);
    expect(respuesta.indicadores[0].formato).toBe(FormatoIndicador.entero);
    expect(respuesta.series.some((s) => s.tipo === TipoSerieCifras.linea)).toBe(true);
  });

  it('rechaza categorías no implementadas', async () => {
    await expect(servicio.obtenerPorCategoria('profesores')).rejects.toMatchObject({
      status: 404,
    });
  });
});
