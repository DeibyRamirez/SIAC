import { describe, expect, it } from 'vitest'

import { promedioAvanceProgramasActivos } from './avance-institucional'

describe('promedioAvanceProgramasActivos', () => {
  it('promedia solo programas activos', () => {
    const valor = promedioAvanceProgramasActivos([
      { porcentajeAvance: 100, activo: true } as never,
      { porcentajeAvance: 0, activo: true } as never,
      { porcentajeAvance: 80, activo: false } as never,
    ])
    expect(valor).toBe(50)
  })
})
