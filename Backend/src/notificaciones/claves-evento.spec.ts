import { claveAnexoD1, claveAvance, claveDictamen, claveRevisionPendiente, claveVigencia } from './claves-evento';

describe('claves de evento (T-007.3c)', () => {
  it('vigencia: {entidadId}:{resolucionId}:{fechaFinISO}:{umbral}:{usuarioId}', () => {
    expect(
      claveVigencia({
        entidadId: 'prog-1',
        resolucionId: 'res-9',
        fechaFinIso: '2027-01-01T00:00:00.000Z',
        umbral: 'amarillo',
        usuarioId: 'u1',
      }),
    ).toBe('vigencia:prog-1:res-9:2027-01-01T00:00:00.000Z:amarillo:u1');
  });

  it('vigencia con token demo: el id de sesión sustituye a la resolución (no bloquea la real)', () => {
    const real = claveVigencia({
      entidadId: 'prog-1',
      resolucionId: 'res-9',
      fechaFinIso: '2027-01-01T00:00:00.000Z',
      umbral: 'amarillo',
      usuarioId: 'u1',
    });
    const demo = claveVigencia({
      entidadId: 'prog-1',
      resolucionId: 'res-9',
      fechaFinIso: '2027-01-01T00:00:00.000Z',
      umbral: 'amarillo',
      usuarioId: 'u1',
      tokenDemo: '1750000000000',
    });
    expect(demo).toBe('vigencia:prog-1:demo-1750000000000:2027-01-01T00:00:00.000Z:amarillo:u1');
    expect(demo).not.toBe(real);
  });

  it('anexo_d1:{anexoId}:{fechaVencimientoISO}:{usuarioId}', () => {
    expect(
      claveAnexoD1({
        anexoId: 'anx-1',
        fechaVencimientoIso: '2026-10-17T00:00:00.000Z',
        usuarioId: 'admin1',
      }),
    ).toBe('anexo_d1:anx-1:2026-10-17T00:00:00.000Z:admin1');
  });

  it('dictamen:{evidenciaId}:v{version}:{usuarioId} y revisión por versión', () => {
    expect(claveDictamen('ev-1', 2, 'car-1')).toBe('dictamen:ev-1:v2:car-1');
    expect(claveRevisionPendiente('ev-1', 3, 'rev-1')).toBe('revision_pendiente:ev-1:v3:rev-1');
  });

  it('avance:{programaId}:{umbral}:{usuarioId}', () => {
    expect(claveAvance('prog-1', 'amarillo', 'u1')).toBe('avance:prog-1:amarillo:u1');
  });
});
