import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProveedorCargaGlobal } from '@/components/siac/proveedor-carga-global'
import { notificarFinCarga, notificarInicioCarga } from '@/lib/servicios/control-carga-global'

describe('ProveedorCargaGlobal', () => {
  afterEach(() => vi.useRealTimers())

  it('muestra cada fase y cubre la barra superior (z-[300])', () => {
    vi.useFakeTimers()
    render(<ProveedorCargaGlobal><div /></ProveedorCargaGlobal>)
    act(() => notificarInicioCarga('Subiendo archivo…'))
    expect(screen.getByText('Subiendo archivo…')).toBeInTheDocument()
    expect(screen.getByTestId('cargador-global').className).toContain('z-[300]')
    // Fase encadenada antes de terminar la anterior: no parpadea y cambia el mensaje.
    act(() => notificarInicioCarga('Enviando a revisión y notificando al revisor…'))
    act(() => notificarFinCarga())
    act(() => vi.advanceTimersByTime(500))
    expect(screen.getByText('Enviando a revisión y notificando al revisor…')).toBeInTheDocument()
    act(() => notificarFinCarga())
    act(() => vi.advanceTimersByTime(500))
    expect(screen.queryByTestId('cargador-global')).toBeNull()
  })
})
