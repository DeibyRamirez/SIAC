import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/auth/proveedor-almacen', () => ({
  usarAlmacen: () => ({ datos: { programas: [] } }),
}))

import {
  FiltrosBusquedaEvidencias,
  type ValoresFiltrosBusqueda,
} from '@/components/siac/filtros-busqueda-evidencias'

const VALORES_BASE: ValoresFiltrosBusqueda = {
  busqueda: '',
  programa: 'todos',
  codigoGuia: 'todos',
  periodo: 'todos',
  estado: 'todos',
  puntajeMin: '',
  puntajeMax: '',
  semaforo: 'todos',
  fechaCargaDesde: '',
  fechaCargaHasta: '',
}

describe('FiltrosBusquedaEvidencias (R-008.3b)', () => {
  const onCambiar = vi.fn()

  beforeEach(() => {
    onCambiar.mockClear()
  })

  it('escribir en el buscador llama a onCambiar con el texto', () => {
    render(<FiltrosBusquedaEvidencias valores={VALORES_BASE} onCambiar={onCambiar} />)

    fireEvent.change(screen.getByLabelText('Buscar evidencias'), {
      target: { value: 'currículo' },
    })

    expect(onCambiar).toHaveBeenCalledWith({ busqueda: 'currículo' })
  })

  it('cambiar el puntaje mínimo y la fecha de carga notifica cada filtro', () => {
    render(<FiltrosBusquedaEvidencias valores={VALORES_BASE} onCambiar={onCambiar} />)

    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Fecha carga desde'), {
      target: { value: '2026-09-01' },
    })

    expect(onCambiar).toHaveBeenCalledWith({ puntajeMin: '5' })
    expect(onCambiar).toHaveBeenCalledWith({ fechaCargaDesde: '2026-09-01' })
  })

  it('el periodo neutro se muestra como «Todos los periodos»', () => {
    render(<FiltrosBusquedaEvidencias valores={VALORES_BASE} onCambiar={onCambiar} />)

    expect(screen.getByLabelText('Filtrar por periodo')).toHaveTextContent('Todos los periodos')
  })

  it('muestra el periodo explícito que viene de la URL', () => {
    render(
      <FiltrosBusquedaEvidencias
        valores={{ ...VALORES_BASE, periodo: '2026-1' }}
        onCambiar={onCambiar}
      />,
    )

    expect(screen.getByLabelText('Filtrar por periodo')).toHaveTextContent('2026-1')
  })

  it('el botón Limpiar solo aparece cuando se pide y llama a onLimpiar', async () => {
    const usuario = userEvent.setup()
    const onLimpiar = vi.fn()
    const { rerender } = render(
      <FiltrosBusquedaEvidencias valores={VALORES_BASE} onCambiar={onCambiar} onLimpiar={onLimpiar} />,
    )
    expect(screen.queryByRole('button', { name: /Limpiar filtros/i })).not.toBeInTheDocument()

    rerender(
      <FiltrosBusquedaEvidencias
        valores={{ ...VALORES_BASE, periodo: '2026-2' }}
        onCambiar={onCambiar}
        onLimpiar={onLimpiar}
        mostrarLimpiar
      />,
    )
    await usuario.click(screen.getByRole('button', { name: /Limpiar filtros/i }))
    expect(onLimpiar).toHaveBeenCalledTimes(1)
  })
})
