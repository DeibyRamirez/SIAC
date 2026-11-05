import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/components/auth/proveedor-sesion', () => ({
  usarSesion: () => ({ sesion: { usuarioId: 'sa', rol: 'SuperAdmin' }, cargando: false }),
}))

vi.mock('@/lib/servicios/integradores.servicio', () => ({
  listarIntegradoresApi: vi.fn(),
  crearIntegradorApi: vi.fn(),
  revocarIntegradorApi: vi.fn(),
}))

import { toast } from 'sonner'
import { PanelClavesIntegracion } from '@/components/siac/panel-claves-integracion'
import {
  crearIntegradorApi,
  listarIntegradoresApi,
  revocarIntegradorApi,
} from '@/lib/servicios/integradores.servicio'

const listar = vi.mocked(listarIntegradoresApi)
const crear = vi.mocked(crearIntegradorApi)
const revocar = vi.mocked(revocarIntegradorApi)

const SIGA = {
  id: 'int-1',
  nombre: 'SIGA',
  activo: true,
  ultimoUsoEn: null,
  revocadoEn: null,
  createdAt: '2026-11-03T12:00:00.000Z',
  updatedAt: '2026-11-03T12:00:00.000Z',
}

describe('PanelClavesIntegracion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listar.mockResolvedValue([])
  })

  it('crea la clave, la muestra una sola vez y permite copiarla', async () => {
    const usuario = userEvent.setup()
    crear.mockResolvedValue({ ...SIGA, clave: 'siac_secreta-una-vez' })
    listar.mockResolvedValueOnce([]).mockResolvedValueOnce([SIGA])
    render(<PanelClavesIntegracion />)

    expect(await screen.findByText('Todavía no hay integradores.')).toBeInTheDocument()
    await usuario.type(screen.getByLabelText('Nombre del integrador'), 'SIGA')
    await usuario.click(screen.getByRole('button', { name: 'Crear clave' }))

    const campo = await screen.findByLabelText('Clave de API')
    expect(campo).toHaveValue('siac_secreta-una-vez')
    await usuario.click(screen.getByRole('button', { name: 'Copiar clave' }))
    await waitFor(() => {
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Clave copiada.')
    })
    expect(await screen.findByText('SIGA')).toBeInTheDocument()
    expect(screen.queryByText('hashClave')).not.toBeInTheDocument()
  })

  it('revoca una clave activa', async () => {
    const usuario = userEvent.setup()
    listar.mockResolvedValue([SIGA])
    revocar.mockResolvedValue({ ...SIGA, activo: false, revocadoEn: '2026-11-03T13:00:00.000Z' })
    render(<PanelClavesIntegracion />)

    await usuario.click(await screen.findByRole('button', { name: 'Revocar' }))
    await usuario.click(screen.getByRole('button', { name: 'Sí, revocar' }))
    await waitFor(() => expect(revocar).toHaveBeenCalledWith('int-1'))
    expect(vi.mocked(toast.success)).toHaveBeenCalled()
  })
})