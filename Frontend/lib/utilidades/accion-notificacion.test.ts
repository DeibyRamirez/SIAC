import { describe, expect, it } from 'vitest'

import {
  contadorBadgeNotificaciones,
  resolverAccionNotificacion,
  textoBadgeNotificaciones,
} from './accion-notificacion'

describe('resolverAccionNotificacion', () => {
  it('revision_pendiente lleva al revisor a la bandeja', () => {
    expect(
      resolverAccionNotificacion('revision_pendiente', { evidenciaId: 'ev-1' }, 'Revisor'),
    ).toEqual({ href: '/revisor/bandeja/ev-1', etiqueta: 'Revisar evidencia' })
    expect(
      resolverAccionNotificacion('revision_pendiente', { evidenciaId: 'ev-1' }, 'Cargador'),
    ).toBeNull()
  })

  it('dictamen lleva al cargador a su evidencia', () => {
    for (const tipo of ['aprobacion', 'observaciones', 'rechazo'] as const) {
      expect(resolverAccionNotificacion(tipo, { evidenciaId: 'ev-2' }, 'Cargador')).toEqual({
        href: '/cargador/evidencias/ev-2',
        etiqueta: 'Ver mi evidencia',
      })
    }
  })

  it('avance: administrador al programa; el par (pausado) no tiene acción', () => {
    expect(
      resolverAccionNotificacion('avance', { programaId: 'prog-1', umbral: 'amarillo' }, 'Administrador'),
    ).toEqual({ href: '/administrador/programas/prog-1', etiqueta: 'Ver programa' })
    expect(resolverAccionNotificacion('avance', { programaId: 'prog-1' }, 'ParAcademico')).toBeNull()
  })

  it('vigencia lleva al administrador a la página de vigencias', () => {
    expect(resolverAccionNotificacion('vigencia', { anexoId: 'an-1' }, 'Administrador')).toEqual({
      href: '/administrador/vigencias',
      etiqueta: 'Ver vigencias',
    })
    expect(resolverAccionNotificacion('vigencia', { anexoId: 'an-1' }, 'Cargador')).toBeNull()
  })

  it('sin metadata válida no navega', () => {
    expect(resolverAccionNotificacion('revision_pendiente', {}, 'Revisor')).toBeNull()
    expect(resolverAccionNotificacion('general', {}, 'Administrador')).toBeNull()
  })
})

describe('badge de campana', () => {
  it('formatea contador y aria-label', () => {
    expect(contadorBadgeNotificaciones(0)).toBeNull()
    expect(contadorBadgeNotificaciones(3)).toBe('3')
    expect(contadorBadgeNotificaciones(120)).toBe('99+')
    expect(textoBadgeNotificaciones(2)).toBe('2 alertas pendientes')
    expect(textoBadgeNotificaciones(100)).toBe('Más de 99 alertas pendientes')
  })
})
