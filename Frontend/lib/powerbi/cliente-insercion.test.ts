import { beforeEach, describe, expect, it, vi } from 'vitest'

const poder = vi.hoisted(() => {
  const setAccessToken = vi.fn(async (_token: string) => undefined)
  const embed = vi.fn((_contenedor: HTMLElement, _configuracion: Record<string, unknown>) => ({
    setAccessToken,
  }))
  const reset = vi.fn()
  return { setAccessToken, embed, reset }
})

vi.mock('powerbi-client', () => ({
  service: {
    Service: vi.fn(function Servicio(this: { embed: typeof poder.embed; reset: typeof poder.reset }) {
      this.embed = poder.embed
      this.reset = poder.reset
    }),
  },
  factories: {
    hpmFactory: {},
    wpmpFactory: {},
    routerFactory: {},
  },
  models: {
    TokenType: { Embed: 1 },
    Permissions: { Read: 0 },
  },
}))

import { incrustarInformePowerBi } from '@/lib/powerbi/cliente-insercion'

describe('incrustarInformePowerBi', () => {
  beforeEach(() => {
    poder.embed.mockClear()
    poder.reset.mockClear()
    poder.setAccessToken.mockClear()
  })

  it('incrusta en solo lectura y renueva con setAccessToken sin volver a incrustar', async () => {
    const contenedor = document.createElement('div')
    const informe = await incrustarInformePowerBi(contenedor, {
      token: 'token-inicial',
      embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=r&groupId=w',
      reportId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    })

    expect(poder.embed).toHaveBeenCalledTimes(1)
    const configuracion = poder.embed.mock.calls[0][1] as unknown as {
      accessToken: string
      tokenType: number
      permissions: number
      settings: { panes: { filters: { visible: boolean } } }
    }
    expect(configuracion.accessToken).toBe('token-inicial')
    expect(configuracion.tokenType).toBe(1)
    expect(configuracion.permissions).toBe(0)
    expect(configuracion.settings.panes.filters.visible).toBe(false)

    await informe.fijarToken('token-renovado')
    expect(poder.setAccessToken).toHaveBeenCalledWith('token-renovado')
    expect(poder.embed).toHaveBeenCalledTimes(1)

    informe.destruir()
    expect(poder.reset).toHaveBeenCalledWith(contenedor)
  })
})
