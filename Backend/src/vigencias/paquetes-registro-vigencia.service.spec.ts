import { CodigoDocumentoGuia, EstadoEvidencia, TipoTramiteSIAC } from '@prisma/client';
import { UMBRALES_SEMAFORO_DEFECTO } from '../dominio/panel-siac';
import { PaquetesRegistroVigenciaService, calcularReferenciaDemoVigencia } from './paquetes-registro-vigencia.service';

describe('PaquetesRegistroVigenciaService', () => {
  const fechaResolucion = new Date('2020-01-01T00:00:00.000Z');

  const prisma = {
    programa: { findMany: jest.fn(), findUnique: jest.fn() },
    institucion: { findFirst: jest.fn(), findUnique: jest.fn() },
    resolucionMen: { findFirst: jest.fn() },
    evidencia: { findMany: jest.fn() },
  };

  const configuracion = {
    obtener: jest.fn(() => UMBRALES_SEMAFORO_DEFECTO),
  };

  const servicio = new PaquetesRegistroVigenciaService(prisma as never, configuracion as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lista paquete de programa con G1, G2 y resolución', async () => {
    prisma.programa.findMany.mockResolvedValue([
      {
        id: 'prog-1',
        nombre: 'Derecho',
        codigo: 'DER',
        fechaResolucion,
        inicioCicloTramiteAt: new Date('2019-01-01'),
      },
    ]);
    prisma.resolucionMen.findFirst.mockResolvedValue({
      tipoTramite: TipoTramiteSIAC.RenovacionRegistroCalificado,
      evidencia: {
        id: 'ev-res',
        nombre: 'Resolución MEN',
        nombreArchivo: 'res.pdf',
        estado: EstadoEvidencia.Validado,
      },
    });
    prisma.evidencia.findMany.mockResolvedValue([
      {
        id: 'ev-g1',
        codigoGuia: CodigoDocumentoGuia.G1,
        nombre: 'G1',
        nombreArchivo: 'g1.docx',
        estado: EstadoEvidencia.Cumple,
        updatedAt: new Date(),
      },
      {
        id: 'ev-g2',
        codigoGuia: CodigoDocumentoGuia.G2,
        nombre: 'G2',
        nombreArchivo: 'g2.docx',
        estado: EstadoEvidencia.Validado,
        updatedAt: new Date(),
      },
    ]);
    prisma.institucion.findFirst.mockResolvedValue(null);

    const lista = await servicio.listar();
    expect(lista).toHaveLength(1);
    expect(lista[0].nombre).toBe('Derecho');
    expect(lista[0].documentos).toHaveLength(3);
    expect(['Amarillo', 'Rojo']).toContain(lista[0].semaforoVigencia);
  });

  it('demo 7 min: referencia avanza hacia el fin de vigencia', () => {
    const inicio = Date.now();
    const referenciaMitad = calcularReferenciaDemoVigencia(
      fechaResolucion,
      inicio,
      inicio + 210_000,
      420,
      7,
    );
    const referenciaFin = calcularReferenciaDemoVigencia(
      fechaResolucion,
      inicio,
      inicio + 420_000,
      420,
      7,
    );
    expect(referenciaMitad.getTime()).toBeGreaterThan(fechaResolucion.getTime());
    expect(referenciaFin.getTime()).toBeGreaterThanOrEqual(
      fechaResolucion.getTime() + 7 * 365.25 * 24 * 60 * 60 * 1000 - 86_400_000,
    );
  });
});
