import { CodigoDocumentoGuia, EstadoEvidencia, Prisma, PrismaClient, RolUsuario } from '@prisma/client';
import { ContextoE2E, crearAppE2E, limpiarDatosNegocio } from '../utilidades/app-e2e';
import {
  asignarPrograma,
  crearEvidencia,
  crearPrograma,
  crearUsuarioE2E,
  idInstitucion,
} from '../utilidades/datos-e2e';

type Tx = Prisma.TransactionClient;
type RolContexto = RolUsuario | 'sistema';

/**
 * RLS a nivel SQL (plan-rls.md §6): conectado como siac_app (sin BYPASSRLS) se prueba que un
 * usuario no lee ni modifica filas de otro programa, de la institución sin ser responsable, de
 * otro rol ni el Borrador de otra persona. Los datos se preparan como dueño (ctx.prisma).
 */
describe('RLS en PostgreSQL (siac_app y siac_powerbi_lectura)', () => {
  let ctx: ContextoE2E;
  const app = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const ids: Record<string, string> = {};

  /** Ejecuta `fn` en una transacción con el contexto que fija el backend (set_config local). */
  async function como<T>(usuarioId: string | null, rol: RolContexto | null, fn: (tx: Tx) => Promise<T>) {
    return app.$transaction(async (tx) => {
      if (rol) {
        await tx.$executeRaw`SELECT set_config('app.usuario_id', ${usuarioId ?? ''}, true), set_config('app.rol', ${rol}, true)`;
      }
      return fn(tx);
    });
  }

  const idsVisibles = (usuarioId: string | null, rol: RolContexto | null) =>
    como(usuarioId, rol, async (tx) =>
      (await tx.evidencia.findMany({ select: { id: true } })).map((e) => e.id).sort(),
    );

  async function esperarRechazoRls(promesa: Promise<unknown>) {
    await expect(promesa).rejects.toThrow(/row-level security|permission denied/);
  }

  beforeAll(async () => {
    ctx = await crearAppE2E({ correoNulo: true });
    await limpiarDatosNegocio(ctx.prisma);

    const [{ rolbypassrls, rolsuper, usuario: rolActual }] = await app.$queryRaw<
      { rolbypassrls: boolean; rolsuper: boolean; usuario: string }[]
    >`SELECT rolbypassrls, rolsuper, current_user AS usuario FROM pg_roles WHERE rolname = current_user`;
    if (rolbypassrls || rolsuper) {
      throw new Error(`DATABASE_URL debe conectar como siac_app (sin BYPASSRLS); conecta como ${rolActual}.`);
    }

    const p = ctx.prisma;
    const progA = await crearPrograma(p, { nombre: 'RLS A', slug: 'rls-a' });
    const progB = await crearPrograma(p, { nombre: 'RLS B', slug: 'rls-b' });
    ids.progA = progA.id;
    ids.progB = progB.id;
    const usuario = async (alias: string, rol: RolUsuario, programa?: string, responsable = false) => {
      const u = await crearUsuarioE2E(p, { alias, rol, contrasena: 'NoSeUsa-RLS-1' });
      if (responsable) {
        await p.usuario.update({ where: { id: u.id }, data: { responsableProcesoInstitucional: true } });
      }
      if (programa) await asignarPrograma(p, u.id, programa);
      return u.id;
    };
    ids.cargA1 = await usuario('rls-carg-a1', RolUsuario.Cargador, progA.id, true);
    ids.cargA2 = await usuario('rls-carg-a2', RolUsuario.Cargador, progA.id);
    ids.cargB = await usuario('rls-carg-b', RolUsuario.Cargador, progB.id);
    ids.revA = await usuario('rls-rev-a', RolUsuario.Revisor, progA.id);
    ids.revInst = await usuario('rls-rev-inst', RolUsuario.Revisor, undefined, true);
    ids.admin = await usuario('rls-admin', RolUsuario.Administrador);
    ids.super = await usuario('rls-super', RolUsuario.SuperAdmin);

    const ev = async (nombre: string, autorId: string, estado: EstadoEvidencia, programaId?: string) =>
      (
        await crearEvidencia(p, {
          nombre,
          autorId,
          programaId,
          institucionId: programaId ? undefined : await idInstitucion(p),
          codigoGuia: programaId ? CodigoDocumentoGuia.G1 : CodigoDocumentoGuia.G3,
          estado,
        })
      ).id;
    ids.borradorA1 = await ev('borrador A1', ids.cargA1, EstadoEvidencia.Borrador, progA.id);
    ids.enviadaA1 = await ev('enviada A1', ids.cargA1, EstadoEvidencia.EnRevision, progA.id);
    ids.enviadaB = await ev('enviada B', ids.cargB, EstadoEvidencia.EnRevision, progB.id);
    ids.institucional = await ev('institucional A1', ids.cargA1, EstadoEvidencia.EnRevision);
    await p.evidenciaVersion.create({
      data: { evidenciaId: ids.borradorA1, numero: 1, nombreArchivo: 'b.docx', rutaArchivo: 'x/b.docx', subidoPorId: ids.cargA1 },
    });
    await p.historialEvidencia.create({
      data: { evidenciaId: ids.enviadaB, estado: EstadoEvidencia.EnRevision, actorId: ids.cargB },
    });
    await p.anexoVigencia.create({
      data: {
        titulo: 'Anexo B',
        programaId: progB.id,
        tipo: 'Convenio',
        fechaVencimiento: new Date('2030-01-01T00:00:00.000Z'),
        responsable: 'otro@uniautonoma.edu.co',
        rutaArchivo: 'anexos/b.pdf',
        evidenciaId: ids.enviadaB,
      },
    });
    ids.alertaB = (await p.alertaInApp.create({ data: { usuarioId: ids.cargB, mensaje: 'Solo para B' } })).id;
    await p.notificacionSalida.create({
      data: { claveEvento: 'rls:prueba', tipo: 'prueba', payload: {}, destinatarioCorreo: 'b@e2e.siac.test' },
    });
  });

  afterAll(async () => {
    await limpiarDatosNegocio(ctx.prisma);
    await app.$disconnect();
    await ctx.app.close();
  });

  it('sin contexto no se ve ninguna fila (fallar cerrado)', async () => {
    await expect(idsVisibles(null, null)).resolves.toEqual([]);
    await expect(como(null, null, (tx) => tx.usuario.count())).resolves.toBe(0);
    await expect(como(null, null, (tx) => tx.programa.count())).resolves.toBe(0);
  });

  it('Cargador: solo lo propio de sus programas; nunca el Borrador ni la evidencia de otro', async () => {
    const a1 = await idsVisibles(ids.cargA1, RolUsuario.Cargador);
    expect(a1).toEqual([ids.borradorA1, ids.enviadaA1, ids.institucional].sort());

    await expect(idsVisibles(ids.cargA2, RolUsuario.Cargador)).resolves.toEqual([]);
    const modificadas = await como(ids.cargA2, RolUsuario.Cargador, (tx) =>
      tx.evidencia.updateMany({ where: { id: ids.borradorA1 }, data: { nombre: 'robado' } }),
    );
    expect(modificadas.count).toBe(0);
    const borradas = await como(ids.cargB, RolUsuario.Cargador, (tx) =>
      tx.evidencia.deleteMany({ where: { id: { in: [ids.borradorA1, ids.enviadaA1] } } }),
    );
    expect(borradas.count).toBe(0);
  });

  it('Cargador: no puede crear evidencias en otro programa ni a nombre de otro autor', async () => {
    const crear = (autorId: string, programaId: string) =>
      como(ids.cargA1, RolUsuario.Cargador, (tx) =>
        tx.evidencia.create({
          data: { nombre: 'x', periodo: '2026-2', autorId, programaId, nombreArchivo: 'x.docx' },
        }),
      );
    await esperarRechazoRls(crear(ids.cargA1, ids.progB));
    await esperarRechazoRls(crear(ids.cargA2, ids.progA));
  });

  it('Revisor: su programa sin borradores; ni otro programa ni lo institucional si no es responsable', async () => {
    await expect(idsVisibles(ids.revA, RolUsuario.Revisor)).resolves.toEqual([ids.enviadaA1]);
    await expect(idsVisibles(ids.revInst, RolUsuario.Revisor)).resolves.toEqual([ids.institucional]);
    const modificadas = await como(ids.revA, RolUsuario.Revisor, (tx) =>
      tx.evidencia.updateMany({ where: { id: ids.enviadaB }, data: { estado: EstadoEvidencia.Validado } }),
    );
    expect(modificadas.count).toBe(0);
    await expect(
      como(ids.revA, RolUsuario.Revisor, (tx) => tx.historialEvidencia.count({ where: { evidenciaId: ids.enviadaB } })),
    ).resolves.toBe(0);
    // Mover una evidencia propia del alcance a otro programa también se rechaza (WITH CHECK).
    await esperarRechazoRls(
      como(ids.revA, RolUsuario.Revisor, (tx) =>
        tx.evidencia.update({ where: { id: ids.enviadaA1 }, data: { programaId: ids.progB } }),
      ),
    );
  });

  it.each([RolUsuario.Administrador, RolUsuario.SuperAdmin])(
    '%s: ve todo lo enviado, pero no el Borrador ajeno ni sus versiones, y no puede tocarlo',
    async (rol) => {
      const quien = rol === RolUsuario.Administrador ? ids.admin : ids.super;
      const visibles = await idsVisibles(quien, rol);
      expect(visibles).toEqual([ids.enviadaA1, ids.enviadaB, ids.institucional].sort());
      await expect(
        como(quien, rol, (tx) => tx.evidenciaVersion.count({ where: { evidenciaId: ids.borradorA1 } })),
      ).resolves.toBe(0);
      const modificadas = await como(quien, rol, (tx) =>
        tx.evidencia.updateMany({ where: { id: ids.borradorA1 }, data: { nombre: 'x' } }),
      );
      expect(modificadas.count).toBe(0);
    },
  );

  it('programas, anexos y resoluciones: solo los asignados (gestión ve todos)', async () => {
    const programas = (u: string, rol: RolContexto) =>
      como(u, rol, async (tx) => (await tx.programa.findMany({ select: { id: true } })).map((x) => x.id).sort());
    await expect(programas(ids.cargA1, RolUsuario.Cargador)).resolves.toEqual([ids.progA]);
    await expect(programas(ids.revA, RolUsuario.Revisor)).resolves.toEqual([ids.progA]);
    await expect(programas(ids.admin, RolUsuario.Administrador)).resolves.toEqual([ids.progA, ids.progB].sort());
    await expect(como(ids.revA, RolUsuario.Revisor, (tx) => tx.anexoVigencia.count())).resolves.toBe(0);
    await expect(como(ids.cargB, RolUsuario.Cargador, (tx) => tx.anexoVigencia.count())).resolves.toBe(1);
    const cambio = await como(ids.cargA1, RolUsuario.Cargador, (tx) =>
      tx.programa.updateMany({ where: { id: ids.progA }, data: { nombre: 'cambio' } }),
    );
    expect(cambio.count).toBe(0);
  });

  it('alertas propias; el outbox y los informes de Power BI no los ven Cargador ni Revisor', async () => {
    await expect(como(ids.cargA1, RolUsuario.Cargador, (tx) => tx.alertaInApp.count())).resolves.toBe(0);
    await expect(como(ids.cargB, RolUsuario.Cargador, (tx) => tx.alertaInApp.count())).resolves.toBe(1);
    const marcadas = await como(ids.cargA1, RolUsuario.Cargador, (tx) =>
      tx.alertaInApp.updateMany({ where: { id: ids.alertaB }, data: { leida: true } }),
    );
    expect(marcadas.count).toBe(0);
    await esperarRechazoRls(
      como(ids.cargA1, RolUsuario.Cargador, (tx) =>
        tx.alertaInApp.create({ data: { usuarioId: ids.cargB, mensaje: 'falsa' } }),
      ),
    );
    await expect(como(ids.revA, RolUsuario.Revisor, (tx) => tx.notificacionSalida.count())).resolves.toBe(0);
    await expect(como(ids.admin, RolUsuario.Administrador, (tx) => tx.notificacionSalida.count())).resolves.toBe(1);
    await expect(
      como(ids.revA, RolUsuario.Revisor, (tx) => tx.configuracionInformePowerBi.count()),
    ).resolves.toBe(0);
  });

  it('usuarios: nadie cambia su propio rol ni a otros usuarios salvo el SuperAdmin', async () => {
    await esperarRechazoRls(
      como(ids.cargA1, RolUsuario.Cargador, (tx) =>
        tx.usuario.update({ where: { id: ids.cargA1 }, data: { rol: RolUsuario.Administrador } }),
      ),
    );
    const otro = await como(ids.admin, RolUsuario.Administrador, (tx) =>
      tx.usuario.updateMany({ where: { id: ids.cargB }, data: { activo: false } }),
    );
    expect(otro.count).toBe(0);
    const porSuper = await como(ids.super, RolUsuario.SuperAdmin, (tx) =>
      tx.usuario.updateMany({ where: { id: ids.cargB }, data: { cargo: 'Docente' } }),
    );
    expect(porSuper.count).toBe(1);
    // Un Cargador de A no ve al Cargador de B (no comparten programa ni evidencias).
    await expect(
      como(ids.cargA1, RolUsuario.Cargador, (tx) => tx.usuario.count({ where: { id: ids.cargB } })),
    ).resolves.toBe(0);
  });

  it("la ruta 'sistema' ve todo (cron, outbox, ingesta)", async () => {
    const visibles = await idsVisibles('sistema', 'sistema');
    expect(visibles).toEqual([ids.borradorA1, ids.enviadaA1, ids.enviadaB, ids.institucional].sort());
  });

  it('el contexto es local a la transacción: no se filtra a la siguiente consulta', async () => {
    await idsVisibles(ids.admin, RolUsuario.Administrador);
    await expect(app.evidencia.count()).resolves.toBe(0);
  });

  describe('siac_powerbi_lectura', () => {
    const url = process.env.DATABASE_URL_POWERBI;
    const powerbi = new PrismaClient({ datasourceUrl: url ?? process.env.DATABASE_URL });

    afterAll(() => powerbi.$disconnect());

    it('solo lee v_powerbi_puntajes, sin borradores, y no accede a Usuario ni escribe', async () => {
      if (!url) throw new Error('Defina DATABASE_URL_POWERBI (rol siac_powerbi_lectura) para esta prueba.');
      await ctx.prisma.evidencia.update({
        where: { id: ids.enviadaB },
        data: { estado: EstadoEvidencia.Validado, puntajeActual: 9, totalCondicionesActual: 9 },
      });
      await ctx.prisma.evidencia.update({
        where: { id: ids.borradorA1 },
        data: { puntajeActual: 1, totalCondicionesActual: 9, updatedAt: new Date(Date.now() + 60_000) },
      });
      const filas = await powerbi.$queryRaw<{ evidenciaId: string }[]>`SELECT "evidenciaId" FROM v_powerbi_puntajes`;
      const visibles = filas.map((f) => f.evidenciaId);
      expect(visibles).toContain(ids.enviadaB);
      expect(visibles).not.toContain(ids.borradorA1);

      await expect(powerbi.$queryRaw`SELECT count(*) FROM "Usuario"`).rejects.toThrow(/permission denied/);
      await expect(powerbi.$queryRaw`SELECT "autorId" FROM "Evidencia"`).rejects.toThrow(/permission denied/);
      await expect(
        powerbi.$executeRaw`UPDATE "Programa" SET "nombre" = 'x'`,
      ).rejects.toThrow(/read-only|permission denied/);
    });
  });
});
