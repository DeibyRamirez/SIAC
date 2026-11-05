import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AVISO_ENLACE_SEGURO_POWERBI } from '@/lib/powerbi/configuracion-powerbi'

const api = vi.hoisted(() => ({
  listarInformesPowerBiApi: vi.fn(),
  actualizarUrlInformePowerBiApi: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}))

vi.mock('@/lib/servicios/cliente-api', () => ({
  apiDisponible: () => true,
}))

vi.mock('@/lib/servicios/powerbi.servicio', () => api)

import { toast } from 'sonner'

import { PanelConfiguracionInformesPowerBi } from '@/components/siac/panel-configuracion-informes-powerbi'

const REPORT = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const CTID = '0f1e2d3c-4b5a-6978-8a7b-6c5d4e3f2a1b'
const URL_VIEW = 'https://app.powerbi.com/view?r=ejemploDePrueba123'
const URL_SEGURA = `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&autoAuth=true&ctid=${CTID}`

function campoAseguramiento() {
  const campo = document.getElementById('pbi-aseguramiento')
  if (!(campo instanceof HTMLInputElement)) throw new Error('Falta el campo de aseguramiento')
  return campo
}

describe('PanelConfiguracionInformesPowerBi', () => {
  beforeEach(() => {
    api.listarInformesPowerBiApi.mockReset()
    api.actualizarUrlInformePowerBiApi.mockReset()
    api.listarInformesPowerBiApi.mockResolvedValue([])
    api.actualizarUrlInformePowerBiApi.mockResolvedValue({
      categoriaId: 'aseguramiento',
      configurado: true,
      urlHash: 'abcdef1234567890',
      activo: true,
      updatedAt: '2026-11-04T00:00:00.000Z',
    })
    vi.mocked(toast.error).mockReset()
    vi.mocked(toast.success).mockReset()
  })

  it('muestra aviso al pegar reportEmbed y no acepta /view?r=', async () => {
    render(<PanelConfiguracionInformesPowerBi />)
    await waitFor(() => {
      expect(api.listarInformesPowerBiApi).toHaveBeenCalled()
    })

    const campo = campoAseguramiento()
    fireEvent.change(campo, { target: { value: URL_VIEW } })
    expect(screen.queryByRole('note')).not.toBeInTheDocument()

    fireEvent.change(campo, { target: { value: URL_SEGURA } })
    expect(screen.getByText('Enlace reportEmbed')).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(AVISO_ENLACE_SEGURO_POWERBI)
  })

  it('guarda el enlace reportEmbed y rechaza javascript', async () => {
    render(<PanelConfiguracionInformesPowerBi />)
    await waitFor(() => expect(api.listarInformesPowerBiApi).toHaveBeenCalled())

    const campo = campoAseguramiento()
    const seccion = campo.closest('div.rounded-lg')
    if (!seccion) throw new Error('Falta la sección del informe')

    fireEvent.change(campo, { target: { value: 'javascript:alert(1)' } })
    fireEvent.click(within(seccion as HTMLElement).getByRole('button', { name: 'Guardar en servidor' }))
    expect(toast.error).toHaveBeenCalled()
    expect(api.actualizarUrlInformePowerBiApi).not.toHaveBeenCalled()

    fireEvent.change(campo, { target: { value: URL_SEGURA } })
    fireEvent.click(within(seccion as HTMLElement).getByRole('button', { name: 'Guardar en servidor' }))
    await waitFor(() => {
      expect(api.actualizarUrlInformePowerBiApi).toHaveBeenCalledWith('aseguramiento', URL_SEGURA)
    })
    expect(toast.success).toHaveBeenCalled()
  })
})
