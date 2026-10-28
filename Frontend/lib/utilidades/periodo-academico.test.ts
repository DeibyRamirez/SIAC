import { describe, expect, it } from 'vitest'

import { agruparPeriodos, periodosVigentes } from '@/lib/utilidades/periodo-academico'

const OCT_2026 = new Date(2026, 9, 28)

describe('periodos académicos (dos por año)', () => {
  it('vigentes: los dos del año actual y los dos del siguiente', () => {
    expect(periodosVigentes(OCT_2026)).toEqual(['2026-1', '2026-2', '2027-1', '2027-2'])
  })

  it('años pasados sin datos no aparecen; con datos van a Históricos', () => {
    const grupos = agruparPeriodos(['2026-2', '2025-1', '2024-2'], OCT_2026)
    expect(grupos.vigentes).toEqual(['2026-1', '2026-2', '2027-1', '2027-2'])
    expect(grupos.historicos).toEqual(['2025-1', '2024-2'])
    expect(grupos.historicos).not.toContain('2025-2')
  })

  it('el periodo pasado que llega por URL sigue accesible', () => {
    expect(agruparPeriodos([], OCT_2026, '2023-1').historicos).toEqual(['2023-1'])
  })

  it('ignora valores con formato inválido', () => {
    expect(agruparPeriodos(['2024-3', 'x'], OCT_2026).historicos).toEqual([])
  })
})
