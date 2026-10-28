import { describe, expect, it } from 'vitest'

import { obtenerMensajeCarga } from '@/lib/servicios/control-carga-global'

describe('mensaje de carga por fase', () => {
  it('con archivo adjunto dice «Subiendo archivo…» aunque sea POST', () => {
    expect(obtenerMensajeCarga('POST', '/evidencias', new FormData())).toBe('Subiendo archivo…')
  })
  it('cada operación conocida tiene su mensaje real', () => {
    expect(obtenerMensajeCarga('POST', '/evidencias/1/enviar-revision')).toMatch(/Enviando a revisión y notificando/)
    expect(obtenerMensajeCarga('POST', '/evidencias/1/dictamen')).toMatch(/^Validando/)
    expect(obtenerMensajeCarga('POST', '/evidencias/1/reemplazo-documento', new FormData())).toMatch(/^Subiendo archivo/)
    expect(obtenerMensajeCarga('PATCH', '/notificaciones/1/leida')).toBe('Actualizando notificaciones…')
  })
  it('sin ruta conocida usa el método (Guardando solo para POST JSON)', () => {
    expect(obtenerMensajeCarga('POST', '/programas', '{}')).toBe('Guardando…')
    expect(obtenerMensajeCarga('PATCH', '/programas/1', '{}')).toBe('Actualizando…')
    expect(obtenerMensajeCarga('DELETE', '/programas/1')).toBe('Eliminando…')
  })
})
