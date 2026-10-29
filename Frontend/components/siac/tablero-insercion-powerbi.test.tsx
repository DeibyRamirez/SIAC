import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const poder = vi.hoisted(() => {
  const fijarToken = vi.fn<(token: string) => Promise<void>>(async () => undefined)
  const destruir = vi.fn()
  const incrustarInformePowerBi = vi.fn(
    async (_contenedor: HTMLElement, _datos: { token: string }) => ({ fijarToken, destruir }),
  )
  const obtenerConfiguracionInsercionPowerBiApi = vi.fn()
  const obtenerTokenInsercionPowerBiApi = vi.fn()
  return {
    fijarToken,
    destruir,
    incrustarInformePowerBi,
    obtenerConfiguracionInsercionPowerBiApi,
    obtenerTokenInsercionPowerBiApi,
  }
})

vi.mock('@/lib/powerbi/cliente-insercion', () => ({
  incrustarInformePowerBi: poder.incrustarInformePowerBi,
}))

vi.mock('@/lib/servicios/powerbi.servicio', () => ({
  obtenerConfiguracionInsercionPowerBiApi: poder.obtenerConfiguracionInsercionPowerBiApi,
  obtenerTokenInsercionPowerBiApi: poder.obtenerTokenInsercionPowerBiApi,
}))

import { TableroInsercionPowerBi } from '@/components/siac/tablero-insercion-powerbi'

const REPORT = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const WORKSPACE = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

function configActiva(activo = true) {
  return {
    habilitado: activo,
    workspaceId: WORKSPACE,
    reportId: REPORT,
    secretoConfigurado: true,
    configuracionCompleta: true,
    activo,
    faltantes: [] as string[],
  }
}

function token(valor: string, dentroDeMs: number) {
  return {
    token: valor,
    embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&groupId=${WORKSPACE}`,
    reportId: REPORT,
    expiraEn: new Date(Date.now() + dentroDeMs).toISOString(),
  }
}

describe('TableroInsercionPowerBi', () => {
  let setItem: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    setItem = vi.spyOn(Storage.prototype, 'setItem')
    poder.fijarToken.mockClear()
    poder.destruir.mockClear()
    poder.incrustarInformePowerBi.mockClear()
    poder.obtenerConfiguracionInsercionPowerBiApi.mockReset()
    poder.obtenerTokenInsercionPowerBiApi.mockReset()
  })

  afterEach(() => {
    setItem.mockRestore()
    vi.useRealTimers()
  })

  it('con el interruptor apagado no incrusta ni pide token', async () => {
    poder.obtenerConfiguracionInsercionPowerBiApi.mockResolvedValue(configActiva(false))
    const { container } = render(<TableroInsercionPowerBi />)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(container).toBeEmptyDOMElement()
    expect(poder.obtenerTokenInsercionPowerBiApi).not.toHaveBeenCalled()
    expect(poder.incrustarInformePowerBi).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
  })

  it('incrusta el informe y renueva con setAccessToken sin volver a incrustar', async () => {
    poder.obtenerConfiguracionInsercionPowerBiApi.mockResolvedValue(configActiva())
    poder.obtenerTokenInsercionPowerBiApi
      .mockResolvedValueOnce(token('token-inicial', 4 * 60 * 1000))
      .mockResolvedValueOnce(token('token-renovado', 60 * 60 * 1000))

    render(<TableroInsercionPowerBi />)

    await waitFor(() => {
      expect(poder.incrustarInformePowerBi).toHaveBeenCalledTimes(1)
    })
    expect(poder.incrustarInformePowerBi.mock.calls[0][1]).toMatchObject({ token: 'token-inicial' })
    await waitFor(() => {
      expect(poder.fijarToken).toHaveBeenCalledWith('token-renovado')
    })
    expect(poder.incrustarInformePowerBi).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Tablero de Power BI')).toBeInTheDocument()
    expect(setItem).not.toHaveBeenCalled()
  })

  it('si Power BI falla muestra el aviso y Reintentar vuelve a pedir el token', async () => {
    poder.obtenerConfiguracionInsercionPowerBiApi.mockResolvedValue(configActiva())
    poder.obtenerTokenInsercionPowerBiApi
      .mockRejectedValueOnce(new Error('caído'))
      .mockResolvedValueOnce(token('token-reintento', 60 * 60 * 1000))

    render(<TableroInsercionPowerBi />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el tablero')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => {
      expect(poder.incrustarInformePowerBi).toHaveBeenCalled()
    })
    expect(screen.getByLabelText('Tablero de Power BI')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('si la renovación falla mantiene el tablero mientras el token anterior siga vigente', async () => {
    vi.useFakeTimers()
    poder.obtenerConfiguracionInsercionPowerBiApi.mockResolvedValue(configActiva())
    poder.obtenerTokenInsercionPowerBiApi
      .mockResolvedValueOnce(token('token-inicial', 4 * 60 * 1000))
      .mockRejectedValue(new Error('red'))

    render(<TableroInsercionPowerBi />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(poder.incrustarInformePowerBi).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000)
    })

    expect(screen.getByLabelText('Tablero de Power BI')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/sigue visible/)
    expect(poder.obtenerTokenInsercionPowerBiApi.mock.calls.length).toBeGreaterThanOrEqual(4)
    expect(setItem).not.toHaveBeenCalled()
  })
})
