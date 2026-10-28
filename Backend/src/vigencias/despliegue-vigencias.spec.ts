import { ConfigService } from '@nestjs/config';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { ConfiguracionSiacService } from '../configuracion/configuracion-siac.service';
import { NotificacionesDespachoService } from '../notificaciones/notificaciones-despacho.service';
import { PrismaService } from '../prisma/prisma.module';
import {
  EvaluadorVigenciaRegistroService,
  NOMBRE_INTERVALO_MODO_PRUEBA,
} from './evaluador-vigencia-registro.service';
import { VigenciaDemoService } from './vigencia-demo.service';
import { VigenciasService, ZONA_HORARIA_SIAC } from './vigencias.service';

function crearEvaluador(
  valores: Record<string, unknown>,
  demo: Partial<VigenciaDemoService> = {},
): EvaluadorVigenciaRegistroService {
  const config = { get: (clave: string) => valores[clave] } as unknown as ConfigService;
  return new EvaluadorVigenciaRegistroService(
    {} as PrismaService,
    {} as ConfiguracionSiacService,
    {} as NotificacionesDespachoService,
    demo as VigenciaDemoService,
    config,
  );
}

describe('Vigencias en despliegue (Render)', () => {
  const nodeEnvOriginal = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = nodeEnvOriginal;
  });

  describe('modo prueba con NODE_ENV=production', () => {
    it('bloquea el arranque por defecto', () => {
      process.env.NODE_ENV = 'production';
      const evaluador = crearEvaluador({ vigenciaModoPrueba: true });
      expect(() => evaluador.onModuleInit()).toThrow(/VIGENCIA_MODO_PRUEBA_PERMITIR_PRODUCCION/);
    });

    it('arranca si la bandera explícita de staging está activa', () => {
      process.env.NODE_ENV = 'production';
      const evaluador = crearEvaluador({
        vigenciaModoPrueba: true,
        vigenciaModoPruebaPermitirProduccion: true,
      });
      expect(() => evaluador.onModuleInit()).not.toThrow();
    });

    it('sin modo prueba arranca normal en producción', () => {
      process.env.NODE_ENV = 'production';
      expect(() => crearEvaluador({ vigenciaModoPrueba: false }).onModuleInit()).not.toThrow();
    });

    it('fuera de producción no exige la bandera', () => {
      process.env.NODE_ENV = 'development';
      expect(() => crearEvaluador({ vigenciaModoPrueba: true }).onModuleInit()).not.toThrow();
    });
  });

  it('el tick del modo prueba no se solapa (evita alertas y correos duplicados)', async () => {
    const evaluador = crearEvaluador(
      {},
      {
        modoPruebaActivo: () => true,
        listarSesionesActivas: () => [{ alcance: 'Programa', entidadId: 'p1', inicioAtMs: 0 }],
      },
    );
    let liberar: () => void = () => undefined;
    const evaluar = jest
      .spyOn(evaluador, 'evaluarTodasLasEntidades')
      .mockImplementation(() => new Promise<void>((resolver) => (liberar = resolver)));

    const primero = evaluador.tickModoPrueba();
    await evaluador.tickModoPrueba();
    expect(evaluar).toHaveBeenCalledTimes(1);

    liberar();
    await primero;
    evaluar.mockResolvedValue(undefined);
    await evaluador.tickModoPrueba();
    expect(evaluar).toHaveBeenCalledTimes(2);
  });

  it('el cron diario corre a las 06:00 en America/Bogota', () => {
    const opciones = Reflect.getMetadata(
      'SCHEDULE_CRON_OPTIONS',
      VigenciasService.prototype.actualizarVigenciasDiarias,
    );
    expect(ZONA_HORARIA_SIAC).toBe('America/Bogota');
    expect(opciones).toMatchObject({ cronTime: CronExpression.EVERY_DAY_AT_6AM, timeZone: 'America/Bogota' });
  });
});

describe('Intervalo configurable del modo prueba (fix B)', () => {
  it('registra el tick con VIGENCIA_INTERVALO_PRUEBA_SEG y lo elimina al cerrar', () => {
    jest.useFakeTimers();
    const programador = new SchedulerRegistry();
    const demo = { modoPruebaActivo: () => true, intervaloPruebaSeg: () => 4, listarSesionesActivas: () => [] };
    const evaluador = new EvaluadorVigenciaRegistroService(
      {} as PrismaService,
      {} as ConfiguracionSiacService,
      {} as NotificacionesDespachoService,
      demo as unknown as VigenciaDemoService,
      { get: () => undefined } as unknown as ConfigService,
      programador,
    );
    const tick = jest.spyOn(evaluador, 'tickModoPrueba').mockResolvedValue(undefined);
    try {
      evaluador.onApplicationBootstrap();
      expect(programador.doesExist('interval', NOMBRE_INTERVALO_MODO_PRUEBA)).toBe(true);
      jest.advanceTimersByTime(12_000);
      expect(tick).toHaveBeenCalledTimes(3);
      evaluador.onModuleDestroy();
      expect(programador.doesExist('interval', NOMBRE_INTERVALO_MODO_PRUEBA)).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('sin modo prueba no registra ningún intervalo', () => {
    const programador = new SchedulerRegistry();
    const evaluador = new EvaluadorVigenciaRegistroService(
      {} as PrismaService,
      {} as ConfiguracionSiacService,
      {} as NotificacionesDespachoService,
      { modoPruebaActivo: () => false } as unknown as VigenciaDemoService,
      { get: () => undefined } as unknown as ConfigService,
      programador,
    );
    evaluador.onApplicationBootstrap();
    expect(programador.getIntervals()).toEqual([]);
  });
});
