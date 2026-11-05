import { RolUsuario } from '@prisma/client';
import {
  UMBRALES_SEMAFORO_DEFECTO,
  calcularReferenciaDemoVigencia,
  calcularSemaforoVigencia,
} from '../dominio/panel-siac';
import { EvaluadorVigenciaRegistroService } from './evaluador-vigencia-registro.service';

describe('Evaluador vigencia registro (escala demo 300 s = 7 años)', () => {
  const fechaResolucion = new Date('2020-06-01T00:00:00.000Z');
  const duracionSeg = 300;
  const umbrales = UMBRALES_SEMAFORO_DEFECTO;

  it('al inicio de la demo el semáforo es verde', () => {
    const inicio = Date.now();
    const ref = calcularReferenciaDemoVigencia(fechaResolucion, inicio, inicio, duracionSeg, 7);
    expect(calcularSemaforoVigencia(fechaResolucion, ref, umbrales)).toBe('Verde');
  });

  it('amarillo a los ~258 s (6/7) y rojo a los ~279 s (6,5/7) de la demo', () => {
    const inicio = Date.now();
    const enAmarillo = calcularReferenciaDemoVigencia(
      fechaResolucion,
      inicio,
      inicio + Math.ceil(duracionSeg * (6 / 7)) * 1000,
      duracionSeg,
      7,
    );
    expect(calcularSemaforoVigencia(fechaResolucion, enAmarillo, umbrales)).toBe('Amarillo');

    const enRojo = calcularReferenciaDemoVigencia(
      fechaResolucion,
      inicio,
      inicio + Math.ceil(duracionSeg * (6.5 / 7)) * 1000,
      duracionSeg,
      7,
    );
    expect(calcularSemaforoVigencia(fechaResolucion, enRojo, umbrales)).toBe('Rojo');
  });

  it('al final de la demo (300 s) el semáforo es Vencido (distinto de Rojo)', () => {
    const inicio = Date.now();
    const ref = calcularReferenciaDemoVigencia(
      fechaResolucion,
      inicio,
      inicio + duracionSeg * 1000,
      duracionSeg,
      7,
    );
    expect(calcularSemaforoVigencia(fechaResolucion, ref, umbrales)).toBe('Vencido');
  });
});

describe('evaluarTodasLasEntidades (CA2: 1 aviso por destinatario y sin duplicados)', () => {
  const clavesCreadas = new Set<string>();

  function crearServicio() {
    const prisma = {
      programa: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            nombre: 'Derecho',
            fechaResolucion: new Date('2020-03-01T00:00:00.000Z'),
            resoluciones: [{ id: 'res-1' }],
          },
        ]),
      },
      institucion: { findFirst: jest.fn().mockResolvedValue(null) },
      usuario: {
        findMany: jest.fn().mockImplementation(async ({ where }: { where: { rol: unknown } }) => {
          const rol = where.rol as { in?: RolUsuario[] };
          return rol?.in
            ? [{ id: 'admin1' }, { id: 'super1' }]
            : [{ id: 'rev1' }];
        }),
      },
    };
    const configuracion = {
      cargar: jest.fn().mockResolvedValue(UMBRALES_SEMAFORO_DEFECTO),
    };
    const despacho = {
      notificar: jest.fn().mockImplementation(async (evento: { claveEvento: string }) => {
        if (clavesCreadas.has(evento.claveEvento)) return { creada: false };
        clavesCreadas.add(evento.claveEvento);
        return { creada: true };
      }),
    };
    const demo = {
      modoPruebaActivo: () => false,
      obtenerSesion: () => null,
      duracionPruebaSeg: () => 300,
      listarSesionesActivas: () => [],
    };
    const config = { get: () => false };

    return {
      servicio: new EvaluadorVigenciaRegistroService(
        prisma as never,
        configuracion as never,
        despacho as never,
        demo as never,
        config as never,
      ),
      despacho,
      prisma,
    };
  }

  beforeEach(() => {
    clavesCreadas.clear();
    // Fin de vigencia 2027-03-01: el 2026-10-01 faltan 5 meses (< 6) → Rojo.
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('programa en Rojo → 1 aviso por Administrador/SuperAdmin/Revisor activos, con clave de evento', async () => {
    const { servicio, despacho } = crearServicio();

    await servicio.evaluarTodasLasEntidades();

    expect(despacho.notificar).toHaveBeenCalledTimes(3);
    const destinos = despacho.notificar.mock.calls.map((c) => c[0]);
    expect(new Set(destinos.map((d) => d.usuarioId))).toEqual(new Set(['admin1', 'super1', 'rev1']));
    for (const evento of destinos) {
      expect(evento.tipo).toBe('vigencia_roja');
      expect(evento.claveEvento).toBe(
        `vigencia:p1:res-1:2027-03-01T00:00:00.000Z:rojo:${evento.usuarioId}`,
      );
    }
  });

  it('reejecutar la evaluación el mismo día no crea claves nuevas (idempotente)', async () => {
    const { servicio, despacho } = crearServicio();

    await servicio.evaluarTodasLasEntidades();
    await servicio.evaluarTodasLasEntidades();

    const creadas = (
      await Promise.all(
        despacho.notificar.mock.calls.map((c) =>
          Promise.resolve((c[0] as { claveEvento: string }).claveEvento),
        ),
      )
    ).filter((clave) => clavesCreadas.has(clave));
    expect(clavesCreadas.size).toBe(3);
    expect(creadas.filter((clave, i) => creadas.indexOf(clave) === i)).toHaveLength(3);
  });

  it('sin resolución MEN no hay avisos', async () => {
    const { servicio, despacho, prisma } = crearServicio();
    prisma.programa.findMany.mockResolvedValue([
      {
        id: 'p2',
        nombre: 'Sin resolución',
        fechaResolucion: null,
        resoluciones: [],
      },
    ]);

    await servicio.evaluarTodasLasEntidades();

    expect(despacho.notificar).not.toHaveBeenCalled();
  });
});

describe('Modo prueba: recuperación de avisos intermedios (fix A)', () => {
  const inicioDemo = Date.parse('2026-10-27T15:00:00.000Z');

  function crearServicio(opciones: { conSesion: boolean; segundosTranscurridos: number }) {
    const claves = new Set<string>();
    const prisma = {
      programa: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            nombre: 'Derecho',
            fechaResolucion: new Date('2025-01-15T00:00:00.000Z'),
            resoluciones: [{ id: 'res-1' }],
          },
        ]),
      },
      institucion: { findFirst: jest.fn().mockResolvedValue(null) },
      usuario: {
        findMany: jest.fn().mockImplementation(async ({ where }: { where: { rol: unknown } }) => {
          const rol = where.rol as { in?: RolUsuario[] };
          return rol?.in ? [{ id: 'admin1' }, { id: 'super1' }] : [{ id: 'rev1' }];
        }),
      },
    };
    const despacho = {
      notificar: jest.fn().mockImplementation(async (evento: { claveEvento: string }) => {
        if (claves.has(evento.claveEvento)) return { creada: false };
        claves.add(evento.claveEvento);
        return { creada: true };
      }),
    };
    const sesion = { alcance: 'Programa', entidadId: 'p1', inicioAtMs: inicioDemo };
    const demo = {
      modoPruebaActivo: () => true,
      obtenerSesion: (_alcance: string, id: string) => (opciones.conSesion && id === 'p1' ? sesion : null),
      duracionPruebaSeg: () => 300,
      listarSesionesActivas: () => (opciones.conSesion ? [sesion] : []),
    };
    const servicio = new EvaluadorVigenciaRegistroService(
      prisma as never,
      { cargar: jest.fn().mockResolvedValue(UMBRALES_SEMAFORO_DEFECTO) } as never,
      despacho as never,
      demo as never,
      { get: () => false } as never,
    );
    const ahora = new Date(inicioDemo + opciones.segundosTranscurridos * 1000);
    return { servicio, despacho, claves, ahora };
  }

  it('si el tick llega ya en Vencido, envía Amarillo, Rojo y Vencido en orden, una vez por destinatario', async () => {
    const { servicio, despacho, ahora } = crearServicio({ conSesion: true, segundosTranscurridos: 305 });

    await servicio.evaluarTodasLasEntidades(ahora);
    await servicio.evaluarTodasLasEntidades(ahora);

    const tipos = despacho.notificar.mock.calls.slice(0, 9).map((c) => c[0].tipo);
    expect(tipos).toEqual([
      ...Array(3).fill('vigencia_amarilla'),
      ...Array(3).fill('vigencia_roja'),
      ...Array(3).fill('vigencia_vencida'),
    ]);
    const creadas = await Promise.all(despacho.notificar.mock.results.map((r) => r.value));
    expect(creadas.filter((r: { creada: boolean }) => r.creada)).toHaveLength(9);
  });

  it('en Rojo sin haber pasado por Amarillo, recupera el Amarillo', async () => {
    const { servicio, despacho, ahora } = crearServicio({ conSesion: true, segundosTranscurridos: 285 });

    await servicio.evaluarTodasLasEntidades(ahora);

    expect(new Set(despacho.notificar.mock.calls.map((c) => c[0].tipo))).toEqual(
      new Set(['vigencia_amarilla', 'vigencia_roja']),
    );
  });

  it('fix C: con modo prueba activo, el cron diario avisa con reloj real a las entidades sin sesión', async () => {
    const { servicio, despacho } = crearServicio({ conSesion: false, segundosTranscurridos: 0 });
    // Reloj real 2031-10-01: fin 2032-01-15, faltan < 6 meses → Rojo (solo el color actual).
    jest.useFakeTimers().setSystemTime(new Date('2031-10-01T12:00:00.000Z'));
    try {
      await servicio.evaluarTodasLasEntidades();
    } finally {
      jest.useRealTimers();
    }
    const eventos = despacho.notificar.mock.calls.map((c) => c[0]);
    expect(eventos).toHaveLength(3);
    expect(eventos.every((e) => e.tipo === 'vigencia_roja')).toBe(true);
    expect(eventos.every((e) => !e.claveEvento.includes(':demo-'))).toBe(true);
  });

  it('fix C: el tick del modo prueba (soloSesionesDemo) ignora las entidades sin sesión', async () => {
    const { servicio, despacho } = crearServicio({ conSesion: false, segundosTranscurridos: 0 });

    await servicio.evaluarTodasLasEntidades(new Date('2031-10-01T12:00:00.000Z'), { soloSesionesDemo: true });

    expect(despacho.notificar).not.toHaveBeenCalled();
  });
});
