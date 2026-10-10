import { describe, expect, it } from 'vitest'

import {
  construirQueryBusqueda,
  leerFiltrosBusquedaUrl,
  rutaBusquedaConPeriodoActual,
} from '@/lib/utilidades/parametros-busqueda-url'

describe('parametros-busqueda-url', () => {
  it('lee programa y puntajeMin desde la URL', () => {
    const filtros = leerFiltrosBusquedaUrl({
      programa: 'derecho',
      puntajeMin: '5',
      q: 'informe',
    })

    expect(filtros.programa).toBe('derecho')
    expect(filtros.puntajeMin).toBe('5')
    expect(filtros.q).toBe('informe')
  })

  it('reconstruye la query conservando filtros', () => {
    const qs = construirQueryBusqueda({
      programa: 'derecho',
      puntajeMin: '5',
    })

    expect(qs).toContain('programa=derecho')
    expect(qs).toContain('puntajeMin=5')
  })

  it('el enlace de entrada fija el periodo actual en la URL', () => {
    expect(rutaBusquedaConPeriodoActual(undefined, new Date(2026, 9, 6))).toBe(
      '/administrador/busqueda?periodo=2026-2',
    )
    expect(rutaBusquedaConPeriodoActual('/x', new Date(2026, 2, 1))).toBe('/x?periodo=2026-1')
  })
})
