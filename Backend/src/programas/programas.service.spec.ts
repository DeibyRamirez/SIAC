import { EstadoEvidencia, EstadoVigencia, RolUsuario } from '@prisma/client';
import { ProgramasService, ProgramaRepositorio, calcularSemaforo } from './programas.service';
import { ServicioAlcancePrograma } from '../common/alcance/servicio-alcance-programa';

describe('calcularSemaforo', () => {
  it('prioriza el anexo de infraestructura vencido', () => {
    expect(
      calcularSemaforo([
        { estado: EstadoVigencia.Vencido, tipo: 'Infraestructura física' },
      ]),
    ).toBe('Rojo');
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
  const servicio = new ProgramasService(
    programaRepo as unknown as ProgramaRepositorio,
    alcance as unknown as ServicioAlcancePrograma,
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
    programaRepo.listarIdsDocumentosObligatorios.mockResolvedValue([]);
    programaRepo.listarEvidenciasParaAvance.mockResolvedValue([
      {
        programaId: 'p1',
        documentoRequeridoId: null,
        porcentajeCompletitud: 40,
        estado: EstadoEvidencia.EnRevision,
        updatedAt: new Date('2026-01-01'),
      },
      {
        programaId: 'p1',
        documentoRequeridoId: null,
        porcentajeCompletitud: 0,
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

  it('el cargador solo lista sus programas activos', async () => {
    alcance.idsProgramasAsignados.mockResolvedValue(['p1']);
    await servicio.listarConSemaforo({ id: 'car', rol: RolUsuario.Cargador });
    expect(programaRepo.listar).toHaveBeenCalledWith({ id: { in: ['p1'] }, activo: true });
  });
});
