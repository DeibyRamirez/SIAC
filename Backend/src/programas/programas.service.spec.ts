import { EstadoEvidencia, EstadoVigencia, RolUsuario } from '@prisma/client';
import {
  ProgramasService,
  ProgramaRepositorio,
  calcularSemaforo,
  calcularSemaforoPrograma,
} from './programas.service';
import {
  AvanceProcesoSIACService,
  porcentajeInternoEvidencia,
} from './avance-proceso-siac.service';
import { ServicioAlcancePrograma } from '../common/alcance/servicio-alcance-programa';
import { TipoTramiteSIAC } from '@prisma/client';

describe('calcularSemaforo', () => {
  it('prioriza el anexo de infraestructura vencido', () => {
    expect(
      calcularSemaforo([
        { estado: EstadoVigencia.Vencido, tipo: 'Infraestructura física' },
      ]),
    ).toBe('Rojo');
  });
});

describe('calcularSemaforoPrograma (regla n/9, D2)', () => {
  const doc = (puntaje: number | null, totalCondiciones: number | null = 9) => ({
    puntaje,
    totalCondiciones,
  });

  it.each([
    [9, 'Verde'],
    [8, 'Amarillo'],
    [5, 'Amarillo'],
    [4, 'Rojo'],
    [0, 'Rojo'],
  ])('documento maestro %i/9 => %s', (puntaje, color) => {
    expect(calcularSemaforoPrograma([], [doc(puntaje as number)])).toBe(color);
  });

  it('un documento con observaciones 5/9 no fuerza rojo', () => {
    expect(calcularSemaforoPrograma([], [doc(5), doc(null, null)])).toBe('Amarillo');
  });

  it('sin verificaciones conserva el color de los anexos', () => {
    expect(calcularSemaforoPrograma([], [doc(null, null)])).toBe('Verde');
  });

  it('RN-003 prevalece sobre un 9/9', () => {
    expect(
      calcularSemaforoPrograma(
        [{ estado: EstadoVigencia.Vencido, tipo: 'Infraestructura física' }],
        [doc(9)],
      ),
    ).toBe('Rojo');
  });

  it('G3 institucional usa n/6', () => {
    expect(calcularSemaforoPrograma([], [doc(6, 6)])).toBe('Verde');
    expect(calcularSemaforoPrograma([], [doc(4, 6)])).toBe('Amarillo');
  });
});

describe('porcentajeInternoEvidencia', () => {
  const base = { puntajeActual: null, totalCondicionesActual: null };

  it('Cumple y Validado aportan 100', () => {
    expect(porcentajeInternoEvidencia({ ...base, estado: EstadoEvidencia.Cumple })).toBe(100);
    expect(porcentajeInternoEvidencia({ ...base, estado: EstadoEvidencia.Validado })).toBe(100);
  });

  it('Con observaciones aporta la proporción de su puntaje', () => {
    expect(
      porcentajeInternoEvidencia({
        estado: EstadoEvidencia.ConObservaciones,
        puntajeActual: 5,
        totalCondicionesActual: 9,
      }),
    ).toBeCloseTo(55.56, 1);
  });

  it('sin verificación o rechazado no aporta', () => {
    expect(porcentajeInternoEvidencia({ ...base, estado: EstadoEvidencia.Borrador })).toBe(0);
    expect(porcentajeInternoEvidencia({ ...base, estado: EstadoEvidencia.EnRevision })).toBe(0);
    expect(
      porcentajeInternoEvidencia({
        estado: EstadoEvidencia.Rechazado,
        puntajeActual: 8,
        totalCondicionesActual: 9,
      }),
    ).toBe(0);
  });
});

describe('ProgramasService', () => {
  const programaRepo = {
    listar: jest.fn(),
    buscarPorId: jest.fn(),
    listarAnexosDeProgramas: jest.fn(),
    agruparEvidenciasPorEstado: jest.fn(),
    listarEvidenciasParaAvance: jest.fn(),
    listarIdsDocumentosObligatorios: jest.fn(),
    listarEstadosEvidencia: jest.fn(),
  };
  const alcance = { idsProgramasAsignados: jest.fn() };
  const avanceProceso = {
    calcularProgresoPrograma: jest.fn(),
  };
  const servicio = new ProgramasService(
    programaRepo as unknown as ProgramaRepositorio,
    alcance as unknown as ServicioAlcancePrograma,
    avanceProceso as unknown as AvanceProcesoSIACService,
  );

  const programa = {
    id: 'p1',
    nombre: 'Derecho',
    codigo: 'DER',
    slug: 'derecho',
    semaforo: 'Verde',
    porcentajeAvance: 99,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    programaRepo.listar.mockResolvedValue([programa]);
    programaRepo.buscarPorId.mockResolvedValue(programa);
    programaRepo.listarAnexosDeProgramas.mockResolvedValue([]);
    avanceProceso.calcularProgresoPrograma.mockResolvedValue({
      programaId: 'p1',
      tipoTramite: TipoTramiteSIAC.RenovacionRegistroCalificado,
      avanceGlobal: 70,
      documentosAceptados: 1,
      documentosTotal: 2,
      documentos: [
        {
          codigoGuia: 'G1',
          nombre: 'Documento maestro de programa',
          peso: 50,
          porcentajeInterno: 40,
          aportacion: 20,
          estado: EstadoEvidencia.EnRevision,
          puntaje: null,
          totalCondiciones: null,
          aceptado: false,
          conObservaciones: false,
          rechazado: false,
        },
        {
          codigoGuia: 'G2',
          nombre: 'Respaldo de mejoramiento de programa',
          peso: 50,
          porcentajeInterno: 100,
          aportacion: 50,
          estado: EstadoEvidencia.Validado,
          puntaje: null,
          totalCondiciones: null,
          aceptado: true,
          conObservaciones: false,
          rechazado: false,
        },
      ],
    });
    programaRepo.listarIdsDocumentosObligatorios.mockResolvedValue([]);
    programaRepo.listarEvidenciasParaAvance.mockResolvedValue([
      {
        programaId: 'p1',
        documentoRequeridoId: null,
        puntajeActual: null,
        totalCondicionesActual: null,
        estado: EstadoEvidencia.EnRevision,
        updatedAt: new Date('2026-01-01'),
      },
      {
        programaId: 'p1',
        documentoRequeridoId: null,
        puntajeActual: null,
        totalCondicionesActual: null,
        estado: EstadoEvidencia.Validado,
        updatedAt: new Date('2026-01-02'),
      },
    ]);
    programaRepo.agruparEvidenciasPorEstado.mockResolvedValue([
      { programaId: 'p1', estado: EstadoEvidencia.Validado, _count: { _all: 2 } },
      { programaId: 'p1', estado: EstadoEvidencia.EnRevision, _count: { _all: 1 } },
      { programaId: 'p1', estado: EstadoEvidencia.Rechazado, _count: { _all: 4 } },
      { programaId: 'p1', estado: EstadoEvidencia.Borrador, _count: { _all: 3 } },
    ]);
    programaRepo.listarEstadosEvidencia.mockResolvedValue([
      { estado: EstadoEvidencia.Validado },
      { estado: EstadoEvidencia.EnRevision },
      { estado: EstadoEvidencia.Rechazado },
      { estado: EstadoEvidencia.Borrador },
    ]);
  });

  it('lista sin escribir el avance y consulta una sola vez por colección', async () => {
    const lista = await servicio.listarConSemaforo({
      id: 'admin',
      rol: RolUsuario.Administrador,
    });

    expect(programaRepo.listarAnexosDeProgramas).toHaveBeenCalledTimes(1);
    expect(programaRepo.agruparEvidenciasPorEstado).toHaveBeenCalledTimes(1);
    expect(lista[0].porcentajeAvance).toBe(70);
    expect(lista[0].semaforo).toBe('Verde');
    expect(lista[0].conteosEstado).toEqual({
      validado: 2,
      enRevision: 1,
      conObservaciones: 0,
      cumple: 0,
      rechazado: 4,
      borrador: 3,
    });
    expect(lista[0].porcentajeAvance).not.toBe(99);
  });

  it('el detalle cuenta todos los estados, no solo los validados', async () => {
    const detalle = await servicio.obtenerPorId('p1');
    expect(detalle.evidencias).toHaveLength(4);
    expect(detalle.conteosEstado.rechazado).toBe(4);
    expect(detalle.conteosEstado.enRevision).toBe(1);
    expect(detalle.evidenciasValidadas).toBe(2);
  });

  it('un documento maestro 5/9 con observaciones queda en amarillo, no en rojo', async () => {
    avanceProceso.calcularProgresoPrograma.mockResolvedValueOnce({
      programaId: 'p1',
      tipoTramite: TipoTramiteSIAC.RenovacionRegistroCalificado,
      avanceGlobal: 28,
      documentosAceptados: 0,
      documentosTotal: 2,
      documentos: [
        {
          codigoGuia: 'G1',
          nombre: 'Documento maestro de programa',
          peso: 50,
          porcentajeInterno: 56,
          aportacion: 28,
          estado: EstadoEvidencia.ConObservaciones,
          puntaje: 5,
          totalCondiciones: 9,
          aceptado: false,
          conObservaciones: true,
          rechazado: false,
        },
      ],
    });

    const [programaListado] = await servicio.listarConSemaforo({
      id: 'admin',
      rol: RolUsuario.Administrador,
    });

    expect(programaListado.semaforo).toBe('Amarillo');
    expect(programaListado.estadoProceso).toBe('Con observaciones');
  });

  it('el cargador solo lista sus programas activos', async () => {
    alcance.idsProgramasAsignados.mockResolvedValue(['p1']);
    await servicio.listarConSemaforo({ id: 'car', rol: RolUsuario.Cargador });
    expect(programaRepo.listar).toHaveBeenCalledWith({ id: { in: ['p1'] }, activo: true });
  });
});
