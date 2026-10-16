import { NotificacionesDespachoService } from './notificaciones-despacho.service';

interface FilaAlerta {
  id: string;
  usuarioId: string;
  mensaje: string;
  tipo: string;
  metadata?: unknown;
  claveEvento?: string | null;
}

interface FilaSalida {
  id: string;
  claveEvento: string;
  usuarioId: string | null;
  destinatarioCorreo?: string | null;
  canal: string;
  tipo: string;
  payload: unknown;
  estado: string;
  intentos: number;
}

/** Prisma falso en memoria: simula las tablas y `$transaction` del outbox (CA2). */
class PrismaFalso {
  alertas: FilaAlerta[] = [];
  salidas: FilaSalida[] = [];
  usuarios = new Map<string, { id: string; correo: string | null }>([
    ['u1', { id: 'u1', correo: 'maria@uniautonoma.edu.co' }],
    ['sin-correo', { id: 'sin-correo', correo: null }],
  ]);

  $transaction = async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> =>
    fn(this.clienteTransaccional());

  clienteTransaccional() {
    return {
      alertaInApp: {
        findUnique: async ({ where }: { where: { claveEvento: string } }) =>
          this.alertas.find((a) => a.claveEvento === where.claveEvento) ?? null,
        create: async ({ data }: { data: Omit<FilaAlerta, 'id'> }) => {
          const fila: FilaAlerta = { ...data, id: `al-${this.alertas.length + 1}` };
          this.alertas.push(fila);
          return fila;
        },
      },
      notificacionSalida: {
        findUnique: async ({ where }: { where: { claveEvento: string } }) =>
          this.salidas.find((s) => s.claveEvento === where.claveEvento) ?? null,
        create: async ({ data }: { data: Omit<FilaSalida, 'id' | 'estado' | 'intentos'> }) => {
          const fila: FilaSalida = {
            ...data,
            id: `ns-${this.salidas.length + 1}`,
            estado: 'Pendiente',
            intentos: 0,
          };
          this.salidas.push(fila);
          return fila;
        },
      },
      usuario: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          this.usuarios.get(where.id) ?? null,
      },
    };
  }
}

describe('NotificacionesDespachoService (outbox C-4)', () => {
  let prisma: PrismaFalso;
  let servicio: NotificacionesDespachoService;

  beforeEach(() => {
    prisma = new PrismaFalso();
    servicio = new NotificacionesDespachoService(prisma as never);
  });

  it('crea la alerta in-app y la fila de outbox con la misma claveEvento', async () => {
    const resultado = await servicio.notificar({
      claveEvento: 'dictamen:ev-1:v2:u1',
      usuarioId: 'u1',
      mensaje: 'Tu evidencia quedó con observaciones.',
      tipo: 'dictamen_con_observaciones',
      asuntoCorreo: '[SIAC] Evidencia con observaciones',
      metadata: { evidenciaId: 'ev-1' },
    });

    expect(resultado.creada).toBe(true);
    expect(prisma.alertas).toHaveLength(1);
    expect(prisma.alertas[0]).toMatchObject({
      usuarioId: 'u1',
      tipo: 'dictamen_con_observaciones',
      claveEvento: 'dictamen:ev-1:v2:u1',
    });
    expect(prisma.salidas).toHaveLength(1);
    expect(prisma.salidas[0]).toMatchObject({
      claveEvento: 'dictamen:ev-1:v2:u1',
      usuarioId: 'u1',
      destinatarioCorreo: 'maria@uniautonoma.edu.co',
      canal: 'correo',
      estado: 'Pendiente',
    });
    const payload = prisma.salidas[0].payload as {
      asunto: string;
      textoPlano: string;
      textoHtml: string;
    };
    expect(payload.asunto).toBe('[SIAC] Evidencia con observaciones');
    expect(payload.textoPlano).toContain('observaciones');
    expect(payload.textoHtml).toContain('/cargador/evidencias/ev-1');
  });

  it('CA2: reejecutar el mismo evento (misma clave) no duplica alerta ni outbox', async () => {
    const evento = {
      claveEvento: 'vigencia:prog-1:res-1:2027-01-01T00:00:00.000Z:amarillo:u1',
      usuarioId: 'u1',
      mensaje: 'Ventana de renovación.',
      tipo: 'vigencia_amarilla',
    };
    const primera = await servicio.notificar(evento);
    const segunda = await servicio.notificar(evento);

    expect(primera.creada).toBe(true);
    expect(segunda.creada).toBe(false);
    expect(prisma.alertas).toHaveLength(1);
    expect(prisma.salidas).toHaveLength(1);
  });

  it('usuario sin correo: solo alerta in-app, sin fila de outbox', async () => {
    const resultado = await servicio.notificar({
      claveEvento: 'avance:prog-1:verde:sin-correo',
      usuarioId: 'sin-correo',
      mensaje: 'Avance.',
      tipo: 'avance',
    });
    expect(resultado.creada).toBe(true);
    expect(prisma.alertas).toHaveLength(1);
    expect(prisma.salidas).toHaveLength(0);
  });

  it('responsable externo: encola correo sin alerta in-app y es idempotente', async () => {
    const evento = {
      claveEvento: 'anexo_d1:anx-1:2026-10-17T00:00:00.000Z:externo:r@x.com',
      destinatarioCorreo: 'R@X.com ',
      mensaje: 'El documento vence mañana.',
      tipo: 'anexo_vence_manana',
    };
    expect((await servicio.encolarCorreoExterno(evento)).creada).toBe(true);
    expect((await servicio.encolarCorreoExterno(evento)).creada).toBe(false);
    expect(prisma.alertas).toHaveLength(0);
    expect(prisma.salidas).toHaveLength(1);
    expect(prisma.salidas[0].destinatarioCorreo).toBe('r@x.com');
  });
});
