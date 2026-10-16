import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const estadoSesion = vi.hoisted(() => ({ rol: 'Administrador' as string }))

vi.mock('@/components/auth/proveedor-sesion', () => ({
  usarSesion: () => ({ sesion: { usuarioId: 'u-admin', rol: estadoSesion.rol } }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/servicios/configuracion.servicio', () => ({
  obtenerUmbralesVigenciaApi: vi.fn(),
  actualizarUmbralesVigenciaApi: vi.fn(),
}))

import { toast } from 'sonner'

import { TarjetaUmbralesSemaforo } from '@/components/siac/tarjeta-umbrales-semaforo'
import {
  actualizarUmbralesVigenciaApi,
  obtenerUmbralesVigenciaApi,
} from '@/lib/servicios/configuracion.servicio'

const UMBRALES = { aniosVigencia: 7, mesesAvisoVigencia: 24, mesesRojoVigencia: 18 }

const obtenerMock = vi.mocked(obtenerUmbralesVigenciaApi)
const actualizarMock = vi.mocked(actualizarUmbralesVigenciaApi)

async function esperarCarga() {
  await waitFor(() => {
    expect(screen.getByLabelText('Aviso amarillo (meses)')).toHaveValue(24)
  })
}

describe('TarjetaUmbralesSemaforo (T-007.3a)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    estadoSesion.rol = 'Administrador'
    obtenerMock.mockResolvedValue(UMBRALES)
    actualizarMock.mockResolvedValue(UMBRALES)
  })

  it('carga y muestra los umbrales vigentes con el botón de guardar', async () => {
    render(<TarjetaUmbralesSemaforo />)

    await esperarCarga()
    expect(screen.getByLabelText('Rojo (meses)')).toHaveValue(18)
    expect(screen.getByText(/vigencia completa de 7 años/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar umbrales' })).toBeEnabled()
  })

  it('valida en cliente que el aviso sea mayor que el rojo y no llama a la API', async () => {
    const usuario = userEvent.setup()
    render(<TarjetaUmbralesSemaforo />)
    await esperarCarga()

    const aviso = screen.getByLabelText('Aviso amarillo (meses)')
    await usuario.clear(aviso)
    await usuario.type(aviso, '10')
    await usuario.click(screen.getByRole('button', { name: 'Guardar umbrales' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El aviso (amarillo) debe ser mayor que el rojo.',
    )
    expect(actualizarMock).not.toHaveBeenCalled()
    expect(vi.mocked(toast.error)).toHaveBeenCalled()
  })

  it('valida el rango 1..84 como el DTO del backend', async () => {
    const usuario = userEvent.setup()
    render(<TarjetaUmbralesSemaforo />)
    await esperarCarga()

    const aviso = screen.getByLabelText('Aviso amarillo (meses)')
    await usuario.clear(aviso)
    await usuario.type(aviso, '90')
    await usuario.click(screen.getByRole('button', { name: 'Guardar umbrales' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('entre 1 y 84 meses')
    expect(actualizarMock).not.toHaveBeenCalled()
  })

  it('guarda los umbrales válidos y muestra el toast de éxito', async () => {
    const usuario = userEvent.setup()
    render(<TarjetaUmbralesSemaforo />)
    await esperarCarga()

    const aviso = screen.getByLabelText('Aviso amarillo (meses)')
    const rojo = screen.getByLabelText('Rojo (meses)')
    await usuario.clear(aviso)
    await usuario.type(aviso, '30')
    await usuario.clear(rojo)
    await usuario.type(rojo, '6')
    await usuario.click(screen.getByRole('button', { name: 'Guardar umbrales' }))

    await waitFor(() => {
      expect(actualizarMock).toHaveBeenCalledWith({
        mesesAvisoVigencia: 30,
        mesesRojoVigencia: 6,
      })
    })
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
      'Umbrales del semáforo actualizados.',
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('muestra el error del backend sin romper la tarjeta', async () => {
    actualizarMock.mockRejectedValue(new Error('Umbrales de semáforo incoherentes.'))
    const usuario = userEvent.setup()
    render(<TarjetaUmbralesSemaforo />)
    await esperarCarga()

    await usuario.click(screen.getByRole('button', { name: 'Guardar umbrales' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Umbrales de semáforo incoherentes.',
    )
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Umbrales de semáforo incoherentes.')
  })

  it('no se renderiza para roles sin permiso (Revisor) ni consulta la API', () => {
    estadoSesion.rol = 'Revisor'
    const { container } = render(<TarjetaUmbralesSemaforo />)

    expect(container).toBeEmptyDOMElement()
    expect(obtenerMock).not.toHaveBeenCalled()
  })
})
