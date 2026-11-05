import { CodigoDocumentoGuia, EstadoEvidencia } from '@prisma/client';
import { ContextoE2E, crearAppE2E, limpiarDatosNegocio, USUARIOS_SEMILLA } from '../utilidades/app-e2e';
import { crearEvidencia, crearPrograma, idInstitucion } from '../utilidades/datos-e2e';

interface FilaVista {
  evidenciaId: string;
  alcance: string;
  programaId: string | null;
  programa: string;
  codigoGuia: string;
  estado: string;
  puntaje: number | null;
  totalCondiciones: number;
  puntajeTexto: string | null;
  condicionesCumplidas: number;
  condicionesNoCumplidas: number;
  semaforoVigencia: string;
}

/**
 * T-009.1 (CA): `SELECT * FROM v_powerbi_puntajes` devuelve programa, guía (G1 n/9, G3 n/6),
 * puntaje, estado, condiciones cumplidas y no cumplidas del último dictamen y semáforo de
 * vigencia, sin datos personales ni borradores.
 */
describe('Vista v_powerbi_puntajes (T-009.1)', () => {
  let ctx: ContextoE2E;
  let autorId: string;

  const hace = (anios: number, meses = 0) => {
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() - anios);
    d.setUTCMonth(d.getUTCMonth() + meses);
    return d;
  };

  const leerVista = () =>
    ctx.prisma.$queryRaw<FilaVista[]>`SELECT * FROM "v_powerbi_puntajes" ORDER BY "codigoGuia", "programa"`;

  beforeAll(async () => {
    ctx = await crearAppE2E({ correoNulo: true });
    await limpiarDatosNegocio(ctx.prisma);
    const autor = await ctx.prisma.usuario.findUniqueOrThrow({
      where: { correo: USUARIOS_SEMILLA.Cargador.correo },
    });
    autorId = autor.id;
  });

  afterAll(async () => {
    await limpiarDatosNegocio(ctx.prisma);
    await ctx.app.close();
  });

  it('G1 n/9 con el último dictamen, G3 n/6 institucional, sin borradores ni datos personales', async () => {
    // Resolución hace 7 años menos 3 meses → quedan 3 meses (< 6) → Rojo.
    const programa = await crearPrograma(ctx.prisma, {
      nombre: 'Derecho Vista E2E',
      slug: 'derecho-vista-e2e',
      fechaResolucion: hace(7, 3),
    });
    const g1 = await crearEvidencia(ctx.prisma, {
      nombre: 'G1 vista',
      autorId,
      programaId: programa.id,
      codigoGuia: CodigoDocumentoGuia.G1,
      estado: EstadoEvidencia.ConObservaciones,
      puntaje: 5,
      total: 9,
    });
    const codigos = await ctx.prisma.$queryRaw<{ codigo: string }[]>`
      SELECT unnest(enum_range(NULL::"CodigoCondicionDocumentoMaestro"))::text AS codigo`;
    // Revisión 1: 2 cumplidas; revisión 2 (la última): 5 cumplidas y 4 no cumplidas.
    for (const numeroRevision of [1, 2]) {
      await ctx.prisma.evaluacionCondicionEvidencia.createMany({
        data: codigos.map(({ codigo }, i) => ({
          evidenciaId: g1.id,
          numeroRevision,
          codigoCondicion: codigo as never,
          cumple: i < (numeroRevision === 1 ? 2 : 5),
        })),
      });
    }
    // Un borrador más reciente de la misma guía no reemplaza la fila ni aparece.
    await crearEvidencia(ctx.prisma, {
      nombre: 'G1 borrador',
      autorId,
      programaId: programa.id,
      codigoGuia: CodigoDocumentoGuia.G1,
      estado: EstadoEvidencia.Borrador,
    });

    const institucionId = await idInstitucion(ctx.prisma);
    await ctx.prisma.institucion.update({
      where: { id: institucionId },
      data: { fechaResolucion: hace(2) },
    });
    await crearEvidencia(ctx.prisma, {
      nombre: 'G3 vista',
      autorId,
      institucionId,
      codigoGuia: CodigoDocumentoGuia.G3,
      estado: EstadoEvidencia.Cumple,
      puntaje: 4,
      total: 6,
    });
    // G2 no tiene puntaje: no entra en la vista.
    await crearEvidencia(ctx.prisma, {
      nombre: 'G2 vista',
      autorId,
      programaId: programa.id,
      codigoGuia: CodigoDocumentoGuia.G2,
      estado: EstadoEvidencia.Validado,
    });

    const filas = await leerVista();

    expect(filas).toHaveLength(2);
    const [filaG1, filaG3] = filas;
    expect(filaG1).toMatchObject({
      evidenciaId: g1.id,
      alcance: 'Programa',
      programaId: programa.id,
      programa: 'Derecho Vista E2E',
      codigoGuia: 'G1',
      estado: 'ConObservaciones',
      puntaje: 5,
      totalCondiciones: 9,
      puntajeTexto: '5/9',
      condicionesCumplidas: 5,
      condicionesNoCumplidas: 4,
      semaforoVigencia: 'Rojo',
    });
    expect(filaG3).toMatchObject({
      alcance: 'Institucion',
      programaId: null,
      codigoGuia: 'G3',
      puntajeTexto: '4/6',
      totalCondiciones: 6,
      semaforoVigencia: 'Verde',
    });

    const columnas = Object.keys(filaG1).join(',');
    expect(columnas).not.toMatch(/autor|revisor|responsable|correo|observacion|ruta|nombreArchivo/i);
  });

  it('el semáforo de vigencia usa los umbrales 12/6 de ConfiguracionSIAC', async () => {
    await limpiarDatosNegocio(ctx.prisma);
    const casos: Array<[string, Date | null, string]> = [
      ['verde', hace(5), 'Verde'], // quedan 24 meses
      ['amarillo', hace(6, -3), 'Amarillo'], // quedan 9 meses
      ['rojo', hace(7, 3), 'Rojo'], // quedan 3 meses
      ['vencido', hace(8), 'Vencido'],
      ['sin', null, 'SinVigencia'],
    ];
    for (const [slug, fechaResolucion] of casos) {
      const programa = await crearPrograma(ctx.prisma, {
        nombre: `Vigencia ${slug}`,
        slug: `vista-vigencia-${slug}`,
        fechaResolucion,
      });
      await crearEvidencia(ctx.prisma, {
        nombre: `G1 ${slug}`,
        autorId,
        programaId: programa.id,
        codigoGuia: CodigoDocumentoGuia.G1,
        estado: EstadoEvidencia.Validado,
        puntaje: 9,
        total: 9,
      });
    }

    const filas = await leerVista();
    const porPrograma = Object.fromEntries(filas.map((f) => [f.programa, f.semaforoVigencia]));
    for (const [slug, , esperado] of casos) {
      expect(porPrograma[`Vigencia ${slug}`]).toBe(esperado);
    }
  });
});
