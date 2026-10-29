import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  obtenerConfiguracionInsercionPowerBiApi: vi.fn(),
  actualizarInsercionPowerBiApi: vi.fn(),
  probarConexionPowerBiApi: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}))

vi.mock('@/lib/servicios/powerbi.servicio', () => api)

import { toast } from 'sonner'

import { TarjetaInsercionPowerBi } from '@/components/siac/tarjeta-insercion-powerbi'

const SECRETO = 'SECRETO-QUE-NO-DEBE-APARECER'
const WORKSPACE = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const REPORT = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

function config(parcial: Record<string, unknown> = {}) {
  return {
    habilitado: false,
    workspaceId: WORKSPACE,
    reportId: REPORT,
    secretoConfigurado: true,
    configuracionCompleta: true,
    activo: false,
    faltantes: [] as string[],
    ...parcial,
  }
}

describe('TarjetaInsercionPowerBi', () => {
  beforeEach(() => {
    api.obtenerConfiguracionInsercionPowerBiApi.mockReset()
    api.actualizarInsercionPowerBiApi.mockReset()
    api.probarConexionPowerBiApi.mockReset()
    vi.mocked(toast.success).mockClear()
    vi.mocked(toast.error).mockClear()
    vi.mocked(toast.message).mockClear()
  })

  it('muestra el secreto solo como configurado y no pinta su valor', async () => {
    api.obtenerConfiguracionInsercionPowerBiApi.mockResolvedValue(config())
    render(<TarjetaInsercionPowerBi />)
    expect(await screen.findByText('configurado ✓')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Insertar el informe de Power BI con token' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(document.body.textContent).not.toContain(SECRETO)
    expect(screen.getByLabelText('Id del área de trabajo')).toHaveValue(WORKSPACE)
    expect(screen.getByLabelText('Id del informe')).toHaveValue(REPORT)
  })

  it('con el interruptor encendido y datos incompletos muestra Configuración incompleta', async () => {
    api.obtenerConfiguracionInsercionPowerBiApi.mockResolvedValue(
      config({
        habilitado: true,
        secretoConfigurado: false,
        configuracionCompleta: false,
        activo: false,
        faltantes: ['POWERBI_CLIENT_SECRET', 'workspaceId'],
      }),
    )
    render(<TarjetaInsercionPowerBi />)
    expect(await screen.findByRole('status')).toHaveTextContent('Configuración incompleta')
    expect(screen.getByText('no configurado')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain(SECRETO)
  })

  it('guarda el interruptor y prueba la conexión sin recibir el token', async () => {
    api.obtenerConfiguracionInsercionPowerBiApi.mockResolvedValue(config())
    api.actualizarInsercionPowerBiApi.mockResolvedValue(config({ habilitado: true, activo: true }))
    api.probarConexionPowerBiApi.mockResolvedValue({
      correcto: true,
      expiraEn: '2026-10-29T13:00:00.000Z',
    })

    render(<TarjetaInsercionPowerBi />)
    await screen.findByText('configurado ✓')

    fireEvent.click(screen.getByRole('switch', { name: 'Insertar el informe de Power BI con token' }))
    await waitFor(() => {
      expect(api.actualizarInsercionPowerBiApi).toHaveBeenCalledWith(
        expect.objectContaining({ habilitado: true, workspaceId: WORKSPACE, reportId: REPORT }),
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Probar conexión' }))
    await waitFor(() => {
      expect(api.probarConexionPowerBiApi).toHaveBeenCalled()
    })
    const respuesta = await api.probarConexionPowerBiApi.mock.results[0].value
    expect(respuesta).not.toHaveProperty('token')
    expect(vi.mocked(toast.success)).toHaveBeenCalled()
  })
})
