import { beforeEach, describe, expect, it } from 'vitest'

import { crearDatosSemilla, ID_INSTITUCION_MOCK } from '@/lib/datos-mock/programas-admin.mock'

const CLAVE_STORAGE = 'siac-programas-mock-v1'

describe('programas-admin mock institución', () => {
  beforeEach(() => {
    localStorage.removeItem(CLAVE_STORAGE)
  })

  it('solo conserva la institución en la semilla', () => {
    const entidades = crearDatosSemilla()
    expect(entidades).toHaveLength(1)
    expect(entidades[0].id).toBe(ID_INSTITUCION_MOCK)
    expect(entidades[0].alcance).toBe('Institucion')
  })

  it('listar panel mock sin programas de catálogo', async () => {
    const { listarPanelProgramasMock } = await import('./programas-admin.mock.servicio')
    const activos = await listarPanelProgramasMock({ estado: 'activos' })
    expect(activos.datos).toHaveLength(0)
  })
})
