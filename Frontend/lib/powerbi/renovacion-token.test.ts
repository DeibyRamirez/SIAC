import { describe, expect, it, vi } from 'vitest'

import {
  ESPERAS_REINTENTO_MS,
  REINTENTOS_RENOVACION,
  ejecutarConReintentos,
  milisegundosHastaRenovacion,
  tokenSigueVigente,
} from '@/lib/powerbi/renovacion-token'

const AHORA = Date.parse('2026-10-29T12:00:00.000Z')

describe('renovación del token de inserción', () => {
  it('programa la renovación cinco minutos antes del vencimiento', () => {
    const expira = new Date(AHORA + 60 * 60 * 1000).toISOString()
    expect(milisegundosHastaRenovacion(expira, AHORA)).toBe(55 * 60 * 1000)
  })

  it('renueva de inmediato si ya entra en el margen de cinco minutos', () => {
    const expira = new Date(AHORA + 4 * 60 * 1000).toISOString()
    expect(milisegundosHastaRenovacion(expira, AHORA)).toBe(0)
    expect(tokenSigueVigente(expira, AHORA)).toBe(true)
  })

  it('un token vencido ya no se considera vigente', () => {
    const expira = new Date(AHORA - 1_000).toISOString()
    expect(tokenSigueVigente(expira, AHORA)).toBe(false)
  })

  it('reintenta tres veces con backoff y se detiene al primer éxito', async () => {
    const esperas: number[] = []
    const accion = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('fallo-1'))
      .mockRejectedValueOnce(new Error('fallo-2'))
      .mockRejectedValueOnce(new Error('fallo-3'))
      .mockResolvedValueOnce('token-nuevo')

    const resultado = await ejecutarConReintentos(accion, {
      reintentos: REINTENTOS_RENOVACION,
      esperasMs: ESPERAS_REINTENTO_MS,
      esperar: async (ms) => {
        esperas.push(ms)
      },
    })

    expect(resultado).toBe('token-nuevo')
    expect(accion).toHaveBeenCalledTimes(4)
    expect(esperas).toEqual([1_000, 2_000, 4_000])
  })

  it('agota los tres reintentos y propaga el último error', async () => {
    const accion = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('sin-red'))
    await expect(
      ejecutarConReintentos(accion, {
        reintentos: REINTENTOS_RENOVACION,
        esperasMs: ESPERAS_REINTENTO_MS,
        esperar: async () => undefined,
      }),
    ).rejects.toThrow('sin-red')
    expect(accion).toHaveBeenCalledTimes(4)
  })
})
