import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('pantalla de vigencia del programa', () => {
  it('la barra de avance dice «Registro calificado», no «Avance de acreditación»', () => {
    const fuente = readFileSync(join(process.cwd(), 'components/siac/detalle-proceso-siac.tsx'), 'utf8')
    expect(fuente).toContain("'Registro calificado'")
    expect(fuente).not.toContain('Avance de acreditación')
  })
})
