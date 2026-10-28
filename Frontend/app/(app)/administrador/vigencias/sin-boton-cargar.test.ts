import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('panel Vigencias y alertas', () => {
  it('ya no ofrece el botón «Cargar documento» ni su diálogo', () => {
    const fuente = readFileSync(join(process.cwd(), 'app/(app)/administrador/vigencias/page.tsx'), 'utf8')
    expect(fuente).not.toContain('Cargar documento')
    expect(fuente).not.toContain('crearVigenciaConArchivoApi')
  })
})
