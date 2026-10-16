import { CorreoMemoriaProveedor } from '../../test/utilidades/correo-memoria';
import { ProcesadorNotificacionesSalidaService } from './procesador-notificaciones-salida.service';

interface FilaSalida {
  id: string;
  claveEvento: string;
  usuarioId: string | null;
  destinatarioCorreo: string | null;
  canal: string;
  tipo: string;
  payload: unknown;
  estado: string;
  intentos: number;
  ultimoError: string | null;
  proximoIntentoAt: Date;
  enviadoAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Prisma falso en memoria para el outbox (CA3): findMany + updateMany condicionado + update. */
class PrismaFalso {
  filas: FilaSalida[] = [];
  usuarios = new Map<string, { id: string; correo: string | null }>();

  notificacionSalida = {
    findMany: async ({ where }: { where: { estado: string; proximoIntentoAt: { lte: Date } } }) =>
      this.filas
        .filter(
          (f) => f.estado === where.estado && f.proximoIntentoAt.getTime() <= where.proximoIntentoAt.lte.getTime(),
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        // Prisma devuelve instantáneas: el reclamo posterior no debe mutar lo ya leído.
        .map((f) => ({ ...f })),
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: string; estado: string; intentos: number };
      data: { intentos: { increment: number }; proximoIntentoAt?: Date };
    }) => {
      const fila = this.filas.find(
        (f) => f.id === where.id && f.estado === where.estado && f.intentos === where.intentos,
      );
      if (!fila) return { count: 0 };
      fila.intentos += data.intentos.increment;
      if (data.proximoIntentoAt) fila.proximoIntentoAt = data.proximoIntentoAt;
      return { count: 1 };
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<FilaSalida> }) => {
      const fila = this.filas.find((f) => f.id === where.id);
      if (!fila) throw new Error(`Fila ${where.id} no existe.`);
      Object.assign(fila, data);
      return fila;
    },
  };

  usuario = {
    findUnique: async ({ where }: { where: { id: string } }) => this.usuarios.get(where.id) ?? null,
  };
}

function crearFila(overrides: Partial<FilaSalida> = {}): FilaSalida {
  return {
    id: 'ns-1',
    claveEvento: 'vigencia:prog:res:fin:amarillo:u1',
    usuarioId: 'u1',
    destinatarioCorreo: null,
    canal: 'correo',
    tipo: 'vigencia_amarilla',
    payload: {
      mensaje: 'Ventana de renovación.',
      asunto: '[SIAC] Inicio de ventana de renovación',
      textoPlano: 'Ventana de renovación.',
      textoHtml: '<p>Ventana de renovación.</p>',
    },
    estado: 'Pendiente',
    intentos: 0,
    ultimoError: null,
    proximoIntentoAt: new Date('2026-10-16T05:00:00.000Z'),
    enviadoAt: null,
    createdAt: new Date('2026-10-16T04:00:00.000Z'),
    updatedAt: new Date('2026-10-16T04:00:00.000Z'),
    ...overrides,
  };
}

function crearServicio(
  prisma: PrismaFalso,
  proveedor: CorreoMemoriaProveedor,
  valoresConfig: Record<string, unknown> = {},
  correo?: { enviar: (mensaje: unknown) => Promise<unknown> },
) {
  const config = {
    get: (clave: string) =>
      clave in valoresConfig ? valoresConfig[clave] : process.env[clave.toUpperCase()],
  };
  return new ProcesadorNotificacionesSalidaService(
    prisma as never,
    (correo ?? {
      enviar: (mensaje: Parameters<CorreoMemoriaProveedor['enviar']>[0]) => proveedor.enviar(mensaje),
    }) as never,
    config as never,
  );
}

describe('ProcesadorNotificacionesSalidaService', () => {
  let prisma: PrismaFalso;
  let proveedor: CorreoMemoriaProveedor;
  const ahora = new Date('2026-10-16T06:00:00.000Z');

  beforeEach(() => {
    prisma = new PrismaFalso();
    proveedor = new CorreoMemoriaProveedor();
    prisma.usuarios.set('u1', { id: 'u1', correo: 'admin@uniautonoma.edu.co' });
  });

  it('envía una fila pendiente y la marca Enviado con enviadoAt', async () => {
    prisma.filas.push(crearFila());
    const servicio = crearServicio(prisma, proveedor, {
      nodeEnv: 'test',
      correoMaxIntentos: 3,
      correoReintentoBaseSegundos: 30,
      correoDestinatariosPermitidos: 'admin@uniautonoma.edu.co',
    });

    const resumen = await servicio.procesarPendientes(ahora);

    expect(resumen.enviados).toBe(1);
    expect(proveedor.mensajes).toHaveLength(1);
    expect(proveedor.mensajes[0]).toMatchObject({
      destinatario: 'admin@uniautonoma.edu.co',
      asunto: '[SIAC] Inicio de ventana de renovación',
    });
    expect(prisma.filas[0]).toMatchObject({ estado: 'Enviado', intentos: 1, enviadoAt: ahora });
  });

  it('CA3: al agotar CORREO_MAX_INTENTOS la fila queda Fallido con ultimoError (alerta intacta)', async () => {
    prisma.filas.push(crearFila());
    proveedor.fallarSiguientes(2);
    const servicio = crearServicio(prisma, proveedor, {
      nodeEnv: 'test',
      correoMaxIntentos: 2,
      correoReintentoBaseSegundos: 30,
      correoDestinatariosPermitidos: 'admin@uniautonoma.edu.co',
    });

    const primer = await servicio.procesarPendientes(ahora);
    expect(primer.pendientes).toBe(1);
    expect(prisma.filas[0].estado).toBe('Pendiente');
    expect(prisma.filas[0].ultimoError).toMatch(/Fallo simulado/);
    // Backoff base·2^(n-1): primer reintento a los 30 s.
    expect(prisma.filas[0].proximoIntentoAt.getTime()).toBe(ahora.getTime() + 30_000);

    const segundo = await servicio.procesarPendientes(
      new Date(ahora.getTime() + 30_000),
    );
    expect(segundo.fallidos).toBe(1);
    expect(prisma.filas[0].estado).toBe('Fallido');
    expect(prisma.filas[0].ultimoError).toMatch(/Fallo simulado/);
    expect(prisma.filas[0].intentos).toBe(2);
  });

  it('desarrollo: destinatario fuera de la lista permitida → Descartado con motivo (no se envía)', async () => {
    prisma.filas.push(crearFila({ destinatarioCorreo: 'ajeno@gmail.com' }));
    const servicio = crearServicio(prisma, proveedor, {
      nodeEnv: 'development',
      correoMaxIntentos: 3,
      correoReintentoBaseSegundos: 30,
      correoDestinatariosPermitidos: 'admin@uniautonoma.edu.co',
    });

    const resumen = await servicio.procesarPendientes(ahora);

    expect(resumen.descartados).toBe(1);
    expect(proveedor.mensajes).toHaveLength(0);
    expect(prisma.filas[0].estado).toBe('Descartado');
    expect(prisma.filas[0].ultimoError).toMatch(/CORREO_DESTINATARIOS_PERMITIDOS/);
  });

  it('lista vacía en desarrollo: no se envía nada (Descartado)', async () => {
    prisma.filas.push(crearFila());
    const servicio = crearServicio(prisma, proveedor, {
      nodeEnv: 'development',
      correoMaxIntentos: 3,
      correoReintentoBaseSegundos: 30,
      correoDestinatariosPermitidos: '',
    });

    const resumen = await servicio.procesarPendientes(ahora);

    expect(resumen.descartados).toBe(1);
    expect(proveedor.mensajes).toHaveLength(0);
  });

  it('en producción no aplica la lista de permitidos', async () => {
    prisma.filas.push(crearFila());
    const servicio = crearServicio(prisma, proveedor, {
      nodeEnv: 'production',
      correoMaxIntentos: 3,
      correoReintentoBaseSegundos: 30,
      correoDestinatariosPermitidos: '',
    });

    const resumen = await servicio.procesarPendientes(ahora);

    expect(resumen.enviados).toBe(1);
  });

  it('reclamo seguro: si el UPDATE condicionado no gana la fila, no se procesa', async () => {
    prisma.filas.push(crearFila());
    prisma.notificacionSalida.updateMany = async () => ({ count: 0 });
    const servicio = crearServicio(prisma, proveedor, {
      nodeEnv: 'test',
      correoMaxIntentos: 3,
      correoReintentoBaseSegundos: 30,
      correoDestinatariosPermitidos: 'admin@uniautonoma.edu.co',
    });

    const resumen = await servicio.procesarPendientes(ahora);

    expect(resumen.enviados).toBe(0);
    expect(proveedor.mensajes).toHaveLength(0);
    expect(prisma.filas[0].estado).toBe('Pendiente');
  });

  it('lease: dos procesadores simultáneos sobre la misma fila → un solo envío', async () => {
    prisma.filas.push(crearFila());
    const valores = {
      nodeEnv: 'test',
      correoMaxIntentos: 3,
      correoReintentoBaseSegundos: 30,
      correoLeaseSegundos: 300,
      correoDestinatariosPermitidos: 'admin@uniautonoma.edu.co',
    };
    const servicioA = crearServicio(prisma, proveedor, valores);
    const servicioB = crearServicio(prisma, proveedor, valores);

    const [resumenA, resumenB] = await Promise.all([
      servicioA.procesarPendientes(ahora),
      servicioB.procesarPendientes(ahora),
    ]);

    expect(resumenA.enviados + resumenB.enviados).toBe(1);
    expect(proveedor.mensajes).toHaveLength(1);
    expect(prisma.filas[0]).toMatchObject({ estado: 'Enviado', intentos: 1 });
  });

  it('lease: otro tick durante un envío en curso no reclama la fila', async () => {
    prisma.filas.push(crearFila({ destinatarioCorreo: 'admin@uniautonoma.edu.co' }));
    const valores = {
      nodeEnv: 'test',
      correoMaxIntentos: 3,
      correoReintentoBaseSegundos: 30,
      correoLeaseSegundos: 300,
      correoDestinatariosPermitidos: 'admin@uniautonoma.edu.co',
    };
    let liberar!: () => void;
    const compuerta = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const servicioLento = crearServicio(prisma, proveedor, valores, {
      enviar: async (mensaje: unknown) => {
        await compuerta;
        await proveedor.enviar(mensaje as Parameters<CorreoMemoriaProveedor['enviar']>[0]);
      },
    });
    const servicioNormal = crearServicio(prisma, proveedor, valores);

    const envioEnCurso = servicioLento.procesarPendientes(ahora);
    // Deja que el primer procesador reclame la fila y quede esperando el envío.
    await new Promise((resolve) => setImmediate(resolve));

    const resumenDelTick = await servicioNormal.procesarPendientes(
      new Date(ahora.getTime() + 1_000),
    );
    expect(resumenDelTick.enviados + resumenDelTick.pendientes).toBe(0);
    expect(proveedor.mensajes).toHaveLength(0);
    // La fila quedó reservada hasta ahora + lease.
    expect(prisma.filas[0].proximoIntentoAt.getTime()).toBe(ahora.getTime() + 300_000);

    liberar();
    const resumenFinal = await envioEnCurso;
    expect(resumenFinal.enviados).toBe(1);
    expect(proveedor.mensajes).toHaveLength(1);
    expect(prisma.filas[0]).toMatchObject({ estado: 'Enviado', intentos: 1 });
  });

  it('lease vencido: la fila de un envío interrumpido se reintenta', async () => {
    prisma.filas.push(
      crearFila({
        destinatarioCorreo: 'admin@uniautonoma.edu.co',
        intentos: 1,
        proximoIntentoAt: new Date(ahora.getTime() + 300_000),
      }),
    );
    const servicio = crearServicio(prisma, proveedor, {
      nodeEnv: 'test',
      correoMaxIntentos: 3,
      correoReintentoBaseSegundos: 30,
      correoLeaseSegundos: 300,
      correoDestinatariosPermitidos: 'admin@uniautonoma.edu.co',
    });

    const dentroDelLease = await servicio.procesarPendientes(
      new Date(ahora.getTime() + 299_000),
    );
    expect(dentroDelLease.enviados).toBe(0);
    expect(proveedor.mensajes).toHaveLength(0);

    const trasElLease = await servicio.procesarPendientes(
      new Date(ahora.getTime() + 300_000),
    );
    expect(trasElLease.enviados).toBe(1);
    expect(proveedor.mensajes).toHaveLength(1);
  });
});
