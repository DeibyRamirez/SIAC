import { describe, expect, it } from 'vitest'

import {
  calcularDistribucionEstadosAdministrador,
  filtrarEvidenciasVisiblesAdministrador,
} from './metricas-evidencias'

describe('métricas administrador', () => {
  it('excluye borradores del panel', () => {
    const filtradas = filtrarEvidenciasVisiblesAdministrador([
      { estado: 'Borrador' },
      { estado: 'EnRevision' },
      { estado: 'Validado' },
    ])
    expect(filtradas).toHaveLength(2)
  })

  it('agrupa válidas, revisión y corrección', () => {
    const dist = calcularDistribucionEstadosAdministrador([
      { estado: 'Borrador' },
      { estado: 'Validado' },
      { estado: 'Cumple' },
      { estado: 'EnRevision' },
      { estado: 'ConObservaciones' },
      { estado: 'Rechazado' },
    ])
    expect(dist).toEqual([
      { estado: 'Validadas', valor: 2, clave: 'validadas' },
      { estado: 'En revisión', valor: 1, clave: 'revision' },
      { estado: 'En corrección', valor: 2, clave: 'correccion' },
    ])
  })
})
