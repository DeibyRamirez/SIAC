import { describe, expect, it } from 'vitest'

import {
  construirQueryBusqueda,
  leerFiltrosBusquedaUrl,
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
})
