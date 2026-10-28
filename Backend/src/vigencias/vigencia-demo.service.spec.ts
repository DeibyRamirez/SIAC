import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UMBRALES_SEMAFORO_DEFECTO, validarDuracionDemoVigencia } from '../dominio/panel-siac';
import { VigenciaDemoService } from './vigencia-demo.service';

/** Camino demo «Iniciar prueba de vigencia (5 min)»: errores 4xx y fuente única de la duración. */
describe('VigenciaDemoService', () => {
  function crear(valores: Record<string, unknown>, fechaResolucion: Date | null = new Date('2025-01-15')) {
    const config = { get: (clave: string) => valores[clave] };
    const configuracion = { cargar: jest.fn().mockResolvedValue(UMBRALES_SEMAFORO_DEFECTO) };
    const prisma = {
      programa: { findUnique: jest.fn().mockResolvedValue(fechaResolucion ? { fechaResolucion } : null) },
      institucion: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    return new VigenciaDemoService(config as never, configuracion as never, prisma as never);
  }

  it('sin modo prueba responde 400 con un mensaje claro (fix E)', async () => {
    const demo = crear({ vigenciaModoPrueba: false });
    await expect(demo.iniciar('Programa', 'p1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(demo.iniciar('Programa', 'p1')).rejects.toThrow(/VIGENCIA_MODO_PRUEBA/);
  });

  it('programa sin resolución MEN responde 404', async () => {
    const demo = crear({ vigenciaModoPrueba: true }, null);
    await expect(demo.iniciar('Programa', 'p1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza una duración que deja un color más corto que dos evaluaciones (fix A)', async () => {
    const demo = crear({ vigenciaModoPrueba: true, vigenciaDuracionPruebaSeg: 40, vigenciaIntervaloPruebaSeg: 10 });
    await expect(demo.iniciar('Programa', 'p1')).rejects.toThrow(/Use al menos 280 s/);
    expect(demo.listarSesionesActivas()).toHaveLength(0);
  });

  it('acepta 300 s con tick de 10 s y expone duración, intervalo e inicio en el estado', async () => {
    const demo = crear({ vigenciaModoPrueba: true, vigenciaDuracionPruebaSeg: 300, vigenciaIntervaloPruebaSeg: 10 });
    const sesion = await demo.iniciar('Programa', 'p1');
    const estado = await demo.consultarEstado('Programa', 'p1');
    expect(estado).toMatchObject({
      modoPrueba: true,
      activa: true,
      inicioAtMs: sesion.inicioAtMs,
      duracionSeg: 300,
      intervaloSeg: 10,
    });
  });

  it('sin sesión (terminada o perdida al reiniciar) el estado lo indica con activa=false e inicio null', async () => {
    const demo = crear({ vigenciaModoPrueba: true });
    const estado = await demo.consultarEstado('Programa', 'p1');
    expect(estado).toMatchObject({ activa: false, inicioAtMs: null, duracionSeg: 300 });
  });
});

describe('validarDuracionDemoVigencia', () => {
  it('300 s con umbrales 12/6 da ventanas de ~21 s: válida con tick de 10 s', () => {
    const r = validarDuracionDemoVigencia(300, 10, UMBRALES_SEMAFORO_DEFECTO);
    expect(r.valida).toBe(true);
    expect(r.ventanaMinimaSeg).toBeCloseTo(21.43, 1);
    expect(r.duracionMinimaSeg).toBe(280);
  });

  it('umbrales iguales (sin ventana amarilla) nunca son válidos', () => {
    const r = validarDuracionDemoVigencia(300, 10, { aniosVigencia: 7, mesesAvisoVigencia: 6, mesesRojoVigencia: 6 });
    expect(r.valida).toBe(false);
  });
});
