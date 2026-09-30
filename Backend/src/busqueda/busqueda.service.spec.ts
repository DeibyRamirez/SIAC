import { CodigoDocumentoGuia, Prisma, RolUsuario } from '@prisma/client';
import { BusquedaService } from './busqueda.service';
import { ServicioAlcancePrograma } from '../common/alcance/servicio-alcance-programa';

describe('BusquedaService filtros HU-008', () => {
  const prisma = {
    evidencia: { findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn((consultas: Promise<unknown>[]) => Promise.all(consultas)),
  };
  const alcance = { filtroVisibilidad: jest.fn() };
  const servicio = new BusquedaService(
    prisma as never,
    alcance as unknown as ServicioAlcancePrograma,
  );
  const admin = { id: 'admin', rol: RolUsuario.Administrador };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.evidencia.findMany.mockResolvedValue([]);
    prisma.evidencia.count.mockResolvedValue(0);
    alcance.filtroVisibilidad.mockResolvedValue({});
  });

  const whereDeLaConsulta = (): Prisma.EvidenciaWhereInput =>
    prisma.evidencia.findMany.mock.calls[0][0].where;

  it('filtra por codigoGuia exacto', async () => {
    await servicio.buscar({ codigoGuia: CodigoDocumentoGuia.G1, programaId: 'prog-1' }, admin);

    const [filtros] = whereDeLaConsulta().AND as Prisma.EvidenciaWhereInput[];
    expect(filtros).toMatchObject({ codigoGuia: CodigoDocumentoGuia.G1, programaId: 'prog-1' });
  });

  it('el texto libre "g3" también encuentra por guía', async () => {
    await servicio.buscar({ busqueda: 'g3' }, admin);

    const [filtros] = whereDeLaConsulta().AND as Prisma.EvidenciaWhereInput[];
    const [texto] = filtros.AND as Prisma.EvidenciaWhereInput[];
    expect(texto.OR).toContainEqual({ codigoGuia: CodigoDocumentoGuia.G3 });
  });

  it('el texto libre no consulta campos retirados (factor, indicador)', async () => {
    await servicio.buscar({ busqueda: 'currículo' }, admin);

    const [filtros] = whereDeLaConsulta().AND as Prisma.EvidenciaWhereInput[];
    const [texto] = filtros.AND as Prisma.EvidenciaWhereInput[];
    const campos = (texto.OR ?? []).flatMap((condicion) => Object.keys(condicion));
    expect(campos).toEqual(['nombre', 'periodo', 'nombreArchivo']);
  });
});
