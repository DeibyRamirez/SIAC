import { EstadoEvidencia, RolUsuario, TipoTramiteSIAC } from '@prisma/client';
import { PanelProgramasService } from './panel-programas.service';
import { UMBRALES_SEMAFORO_DEFECTO, UmbralesSemaforo } from '../dominio/panel-siac';

interface ProgramaFalso {
  id: string;
  nombre: string;
  codigo: string;
  tipoTramiteActivo: TipoTramiteSIAC;
  fechaResolucion: Date | null;
  activo: boolean;
  urlImagen: null;
}

interface EvidenciaFalsa {
  programaId: string;
  codigoGuia: 'G1' | 'G2';
  estado: EstadoEvidencia;
  puntajeActual: number | null;
  totalCondicionesActual: number | null;
  updatedAt: Date;
  periodo: string;
}

function crearServicio(
  programas: ProgramaFalso[],
  evidencias: EvidenciaFalsa[],
  opciones: { umbrales?: UmbralesSemaforo; tramites?: unknown[] } = {},
) {
  const umbrales = opciones.umbrales ?? UMBRALES_SEMAFORO_DEFECTO;
  const configuracion = { cargar: jest.fn().mockResolvedValue(umbrales), obtener: () => umbrales };
  const prisma = {
    tramiteSIAC: { findMany: jest.fn().mockResolvedValue(opciones.tramites ?? []) },
    programa: {
      count: jest.fn().mockResolvedValue(programas.length),
      findMany: jest.fn(({ skip, take }: { skip?: number; take?: number }) =>
        Promise.resolve(programas.slice(skip ?? 0, take ? (skip ?? 0) + take : undefined)),
      ),
    },
    anexoVigencia: { findMany: jest.fn().mockResolvedValue([]) },
    evidencia: {
      findMany: jest.fn(({ where }: { where: { programaId: { in: string[] } } }) =>
        Promise.resolve(evidencias.filter((e) => where.programaId.in.includes(e.programaId))),
      ),
    },
  };
  const servicio = new PanelProgramasService(prisma as never, {} as never, configuracion as never);
  return { servicio, prisma };
}

const ADMIN = { id: 'admin', rol: RolUsuario.Administrador };
const RECIENTE = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

function programa(i: number, tipo: TipoTramiteSIAC = TipoTramiteSIAC.RegistroCalificadoNuevo): ProgramaFalso {
  const n = String(i).padStart(2, '0');
  return {
    id: `p${n}`,
    nombre: `Programa ${n}`,
    codigo: `P${n}`,
    tipoTramiteActivo: tipo,
    fechaResolucion: RECIENTE,
    activo: true,
    urlImagen: null,
  };
}

describe('PanelProgramasService (T-010.1)', () => {
  it('8/9 en G1 con peso 90 da 80,0 % (sin redondeo intermedio)', async () => {
    const { servicio } = crearServicio(
      [programa(1, TipoTramiteSIAC.RenovacionRegistroCalificado)],
      [
        {
          programaId: 'p01',
          codigoGuia: 'G1',
          estado: EstadoEvidencia.ConObservaciones,
          puntajeActual: 8,
          totalCondicionesActual: 9,
          updatedAt: new Date('2026-10-01'),
          periodo: '2026-2',
        },
      ],
    );
    await servicio.onModuleInit();

    const { datos } = await servicio.listarPanel({}, ADMIN);
    const g1 = datos[0].documentos.find((d) => d.codigoGuia === 'G1')!;

    expect(datos[0].avancePorcentual).toBe(80);
    expect(g1.aportacion).toBe(80);
    expect(g1.porcentajeInterno).toBe(88.89);
  });

  it('devuelve fecha de resolución y semestre de la evidencia usada', async () => {
    const { servicio } = crearServicio(
      [{ ...programa(1), fechaResolucion: new Date('2021-05-10T00:00:00.000Z') }],
      [
        {
          programaId: 'p01',
          codigoGuia: 'G1',
          estado: EstadoEvidencia.Cumple,
          puntajeActual: 9,
          totalCondicionesActual: 9,
          updatedAt: new Date('2026-09-01'),
          periodo: '2026-1',
        },
      ],
    );
    await servicio.onModuleInit();

    const { datos } = await servicio.listarPanel({}, ADMIN);

    expect(datos[0].fechaResolucion).toBe('2021-05-10T00:00:00.000Z');
    expect(datos[0].semestre).toBe('2026-1');
  });

  it('filtra por semáforo antes de paginar: 25 programas, 12 en rojo → total 12 y 2 páginas', async () => {
    const programas = Array.from({ length: 25 }, (_, i) => programa(i + 1));
    // Los 13 primeros quedan en verde (G1 aprobado, resolución reciente); los 12 últimos sin revisión → rojo.
    const evidencias: EvidenciaFalsa[] = programas.slice(0, 13).map((p) => ({
      programaId: p.id,
      codigoGuia: 'G1',
      estado: EstadoEvidencia.Cumple,
      puntajeActual: 9,
      totalCondicionesActual: 9,
      updatedAt: new Date('2026-09-01'),
      periodo: '2026-2',
    }));
    const { servicio, prisma } = crearServicio(programas, evidencias);
    await servicio.onModuleInit();

    const pagina1 = await servicio.listarPanel({ semaforo: 'rojo', page: 1, limit: 10 }, ADMIN);
    const pagina2 = await servicio.listarPanel({ semaforo: 'rojo', page: 2, limit: 10 }, ADMIN);

    expect(pagina1.total).toBe(12);
    expect(pagina1.totalPaginas).toBe(2);
    expect(pagina1.datos).toHaveLength(10);
    expect(pagina2.datos.map((f) => f.id)).toEqual(['p24', 'p25']);
    expect(pagina1.datos.every((f) => f.semaforoGeneral === 'Rojo')).toBe(true);
    // Con filtro de semáforo no se pagina en la BD.
    expect(prisma.programa.findMany.mock.calls[0][0].skip).toBeUndefined();
  });

  it('sin filtro de semáforo pagina en la BD y respeta el total', async () => {
    const programas = Array.from({ length: 25 }, (_, i) => programa(i + 1));
    const { servicio } = crearServicio(programas, []);
    await servicio.onModuleInit();

    const respuesta = await servicio.listarPanel({ page: 3, limit: 10 }, ADMIN);

    expect(respuesta.total).toBe(25);
    expect(respuesta.totalPaginas).toBe(3);
    expect(respuesta.datos).toHaveLength(5);
  });
});

describe('PanelProgramasService (T-010.2)', () => {
  function evidenciaG1(programaId: string, puntaje: number, total: number): EvidenciaFalsa {
    return {
      programaId,
      codigoGuia: 'G1',
      estado: EstadoEvidencia.ConObservaciones,
      puntajeActual: puntaje,
      totalCondicionesActual: total,
      updatedAt: new Date('2026-09-01'),
      periodo: '2026-2',
    };
  }

  it('con pesos 90/20 en la BD el servicio no arranca', async () => {
    const { servicio } = crearServicio([], [], {
      tramites: [
        {
          tipo: TipoTramiteSIAC.RenovacionRegistroCalificado,
          documentos: [
            { codigoGuia: 'G1', pesoPorcentaje: 90 },
            { codigoGuia: 'G2', pesoPorcentaje: 20 },
          ],
        },
      ],
    });

    await expect(servicio.onModuleInit()).rejects.toThrow(/Pesos inválidos.*110/);
  });

  it('al subir el umbral amarillo a 60, un avance de 58 % pasa de amarillo a rojo', async () => {
    const evidencias = [evidenciaG1('p01', 29, 50)];
    const porDefecto = crearServicio([programa(1)], evidencias);
    await porDefecto.servicio.onModuleInit();
    const conUmbral60 = crearServicio([programa(1)], evidencias, {
      umbrales: { ...UMBRALES_SEMAFORO_DEFECTO, minimoAmarillo: 60 },
    });
    await conUmbral60.servicio.onModuleInit();

    const antes = (await porDefecto.servicio.listarPanel({}, ADMIN)).datos[0];
    const despues = (await conUmbral60.servicio.listarPanel({}, ADMIN)).datos[0];

    expect(antes.avancePorcentual).toBe(58);
    expect(antes.semaforoAvance).toBe('Amarillo');
    expect(despues.semaforoAvance).toBe('Rojo');
  });

  it('sin fecha de resolución la vigencia es «SinVigencia» (gris), nunca verde', async () => {
    const { servicio } = crearServicio(
      [{ ...programa(1), fechaResolucion: null }],
      [{ ...evidenciaG1('p01', 9, 9), estado: EstadoEvidencia.Cumple }],
    );
    await servicio.onModuleInit();

    const [fila] = (await servicio.listarPanel({}, ADMIN)).datos;

    expect(fila.semaforoVigencia).toBe('SinVigencia');
    expect(fila.fechaFinVigencia).toBeNull();
    expect(fila.semaforoGeneral).toBe('Verde'); // lo define el avance (100 %), no una vigencia inexistente
  });

  it('resolución 2020-03-01 → fin 2027-03-01', async () => {
    const { servicio } = crearServicio(
      [{ ...programa(1), fechaResolucion: new Date('2020-03-01T00:00:00.000Z') }],
      [],
    );
    await servicio.onModuleInit();

    const [fila] = (await servicio.listarPanel({}, ADMIN)).datos;

    expect(fila.fechaFinVigencia).toBe('2027-03-01T00:00:00.000Z');
  });
});
