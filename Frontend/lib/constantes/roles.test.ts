import { describe, expect, it } from 'vitest'

import { etiquetaRol } from '@/lib/auth-mock'
import { nombreVisibleRol } from '@/lib/constantes/roles'

describe('alias visible del rol Cargador', () => {
  it('Cargador se muestra como Profesor sin cambiar el valor del rol', () => {
    expect(nombreVisibleRol('Cargador')).toBe('Profesor')
    expect(etiquetaRol('Cargador')).toBe('Profesor')
    expect(nombreVisibleRol('Revisor')).toBe('Revisor')
  })
})
