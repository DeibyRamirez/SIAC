import { describe, expect, it } from 'vitest'

import {
  agruparPeriodos,
  avisoPeriodoDocumento,
  periodoAcademicoActual,
  periodoSeleccionado,
  periodosVigentes,
} from '@/lib/utilidades/periodo-academico'

const OCT_2026 = new Date(2026, 9, 28, 12)
const AGOSTO_2027 = new Date('2027-08-15T15:00:00-05:00')

describe('periodos académicos (dos por año)', () => {
  it('vigentes: los dos del año actual y los dos del siguiente', () => {
    expect(periodosVigentes(OCT_2026)).toEqual(['2026-1', '2026-2', '2027-1', '2027-2'])
  })

  it('el semestre sale del calendario de Bogotá, no del reloj UTC', () => {
    expect(periodoAcademicoActual(new Date('2027-01-01T02:00:00Z'))).toBe('2026-2')
    expect(periodoAcademicoActual(new Date('2027-01-01T05:00:00Z'))).toBe('2027-1')
    expect(periodoAcademicoActual(new Date('2027-07-01T04:30:00Z'))).toBe('2027-1')
    expect(periodoAcademicoActual(AGOSTO_2027)).toBe('2027-2')
  })

  it('años pasados sin datos no aparecen; con datos van a Históricos', () => {
    const grupos = agruparPeriodos(['2026-2', '2025-1', '2024-2'], OCT_2026)
    expect(grupos.vigentes).toEqual(['2026-1', '2026-2', '2027-1', '2027-2'])
    expect(grupos.historicos).toEqual(['2025-1', '2024-2'])
    expect(grupos.historicos).not.toContain('2025-2')
  })

  it('en 2027-2, 2026-2 con datos sigue en Históricos y no se pierde', () => {
    const grupos = agruparPeriodos(['2026-2', '2027-2'], AGOSTO_2027, '2026-2')
    expect(grupos.vigentes).toEqual(['2027-1', '2027-2', '2028-1', '2028-2'])
    expect(grupos.historicos).toEqual(['2026-2'])
  })

  it('el periodo pasado que llega por URL sigue accesible', () => {
    expect(agruparPeriodos([], OCT_2026, '2023-1').historicos).toEqual(['2023-1'])
    expect(periodoSeleccionado('2026-2', '2027-2')).toBe('2026-2')
    expect(periodoSeleccionado('no-es-periodo', '2027-2')).toBe('2027-2')
  })

  it('ignora valores con formato inválido', () => {
    expect(agruparPeriodos(['2024-3', 'x'], OCT_2026).historicos).toEqual([])
  })

  it('un .docx con otro periodo avisa y no pide reemplazar el seleccionado', () => {
    expect(avisoPeriodoDocumento('2027-2', '2026-2')).toMatch(/2026-2/)
    expect(avisoPeriodoDocumento('2027-2', '2026-2')).toMatch(/2027-2/)
    expect(avisoPeriodoDocumento('2026-2', '2026-2')).toBeNull()
    expect(avisoPeriodoDocumento('2026-2', undefined)).toBeNull()
  })
})
