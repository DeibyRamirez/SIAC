import { describe, expect, it } from 'vitest'
import { camposPropietarioEvidencia, esGuiaInstitucional } from './propietario-evidencia'
import { obtenerNombrePropietario, etiquetaPropietario } from '@/lib/utilidades-siac'

describe('propietario de la evidencia (HU-010)', () => {
  it('G3/G4 no envían programa; la institución solo si se conoce', () => {
    expect(esGuiaInstitucional('G4')).toBe(true)
    expect(camposPropietarioEvidencia({ codigoGuia: 'G3', programaId: 'p1' })).toEqual([])
    expect(
      camposPropietarioEvidencia({ codigoGuia: 'G4', programaId: 'p1', institucionId: 'inst-cuac' }),
    ).toEqual([['institucionId', 'inst-cuac']])
  })

  it('G1/G2 envían solo el programa', () => {
    expect(
      camposPropietarioEvidencia({ codigoGuia: 'G1', programaId: 'p1', institucionId: 'inst-cuac' }),
    ).toEqual([['programaId', 'p1']])
    expect(camposPropietarioEvidencia({ codigoGuia: 'G2' })).toEqual([])
  })

  it('el nombre y la etiqueta del propietario distinguen institución y programa', () => {
    const programas = [{ id: 'p1', nombre: 'Derecho' }]
    const institucional = {
      programaId: null,
      institucionId: 'inst-cuac',
      institucion: { id: 'inst-cuac', nombre: 'Corporación Universitaria Autónoma del Cauca', codigo: 'CUAC' },
      codigoGuia: 'G3' as const,
    }
    expect(obtenerNombrePropietario(institucional, programas)).toBe(
      'Corporación Universitaria Autónoma del Cauca (CUAC)',
    )
    expect(etiquetaPropietario(institucional)).toBe('Institución')
    const dePrograma = { programaId: 'p1', institucionId: null, codigoGuia: 'G1' as const }
    expect(obtenerNombrePropietario(dePrograma, programas)).toBe('Derecho')
    expect(etiquetaPropietario(dePrograma)).toBe('Programa')
  })
})
