import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/layout/shell-aplicacion', () => ({
  PlantillaPaginaApp: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock('@/components/auth/proveedor-sesion', () => ({
  usarSesion: () => ({ sesion: { usuarioId: 'u-cargador', rol: 'Cargador', nombre: 'María' } }),
}))
// Referencia estable, como la del proveedor real: si `datos` cambiara en cada render,
// la página volvería a pedir la lista sin fin.
const almacen = vi.hoisted(() => ({ datos: { evidencias: [] }, eliminarEvidencia: () => {} }))
vi.mock('@/components/auth/proveedor-almacen', () => ({
  usarAlmacen: () => almacen,
}))
vi.mock('@/components/siac/filtro-programa', () => ({ FiltroPrograma: () => null }))
vi.mock('@/lib/servicios/cliente-api', () => ({ apiDisponible: () => true }))
vi.mock('@/lib/servicios/evidencias.servicio', () => ({ listarEvidenciasApi: vi.fn() }))

import MisEvidenciasPage from './page'
import { listarEvidenciasApi } from '@/lib/servicios/evidencias.servicio'

const listarMock = vi.mocked(listarEvidenciasApi)

function diferida<T>() {
  let resolver!: (valor: T) => void
  const promesa = new Promise<T>((res) => {
    resolver = res
  })
  return { promesa, resolver }
}

describe('Mis evidencias (Cargador): estados de carga', () => {
  beforeEach(() => {
    listarMock.mockReset()
  })

  it('muestra «Cargando evidencias…» y luego el estado vacío solo al terminar', async () => {
    const pendiente = diferida<{ datos: never[]; total: number; pagina: number; limite: number }>()
    listarMock.mockReturnValue(pendiente.promesa as never)

    render(<MisEvidenciasPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando evidencias…')
    expect(screen.queryByText('Aún no has registrado evidencias.')).not.toBeInTheDocument()

    pendiente.resolver({ datos: [], total: 0, pagina: 1, limite: 10 })
    expect(await screen.findByText('Aún no has registrado evidencias.')).toBeInTheDocument()
  })

  it('con fallo de red muestra el error y «Reintentar» vuelve a pedir la lista', async () => {
    listarMock.mockRejectedValueOnce(new Error('Failed to fetch'))
    listarMock.mockResolvedValue({ datos: [], total: 0, pagina: 1, limite: 10 } as never)

    render(<MisEvidenciasPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar tus evidencias.',
    )
    expect(screen.queryByText('Aún no has registrado evidencias.')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(listarMock).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Aún no has registrado evidencias.')).toBeInTheDocument()
  })
})
