import { describe, expect, it } from 'vitest'

import {
  TAMANO_MAXIMO_EVIDENCIA_BYTES,
  TAMANO_MAXIMO_EVIDENCIA_MB,
  validarTamanoEvidencia,
} from './documentos'

const MB = 1024 * 1024

describe('límite de tamaño de evidencia (HU-006 §5.2)', () => {
  it('acepta un archivo de 20 MB exactos', () => {
    expect(TAMANO_MAXIMO_EVIDENCIA_MB).toBe(20)
    expect(TAMANO_MAXIMO_EVIDENCIA_BYTES).toBe(20 * MB)
    expect(validarTamanoEvidencia(20 * MB)).toBeNull()
  })

  it('rechaza un archivo de 21 MB con el texto «20 MB»', () => {
    const mensaje = validarTamanoEvidencia(21 * MB)
    expect(mensaje).not.toBeNull()
    expect(mensaje).toContain('20 MB')
  })

  it('acepta un archivo pequeño', () => {
    expect(validarTamanoEvidencia(1024)).toBeNull()
  })
})
