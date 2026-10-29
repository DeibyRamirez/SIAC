import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Usabilidad: ningún texto visible dice «Cargador»; la UI muestra «Profesor».
 * El rol interno `Cargador`, las rutas `/cargador` y las credenciales semilla no cambian.
 * Se revisan literales con espacios (frases) y texto JSX; se ignoran comentarios.
 */
const RAICES = ['app', 'components', 'lib']

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) return nombre === 'node_modules' ? [] : archivos(ruta)
    return /\.(tsx?|jsx?)$/.test(nombre) && !/\.test\./.test(nombre) ? [ruta] : []
  })
}

function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
}

export function textosVisiblesConCargador(fuente: string): string[] {
  const limpio = sinComentarios(fuente)
  const literales = [...limpio.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`|>([^<>{}()=;]+)</g)].map(
    (m) => m[1] ?? m[2] ?? m[3] ?? m[4] ?? '',
  )
  return literales.filter((t) => /cargador/i.test(t) && /\s/.test(t.trim()))
}

describe('ningún texto visible dice Cargador', () => {
  it('el detector encuentra frases y respeta rutas, enum y credenciales', () => {
    expect(textosVisiblesConCargador(`<p>Módulo cargador</p>`)).toHaveLength(1)
    expect(textosVisiblesConCargador(`const a = 'El cargador verá'`)).toHaveLength(1)
    expect(
      textosVisiblesConCargador(`rol: 'Cargador', href: '/cargador/evidencias', correo: 'maria.cargadora@x.co'`),
    ).toEqual([])
  })

  it('app, components y lib no tienen frases visibles con Cargador', () => {
    const hallazgos = RAICES.flatMap((raiz) =>
      archivos(join(process.cwd(), raiz)).flatMap((ruta) =>
        textosVisiblesConCargador(readFileSync(ruta, 'utf8')).map((t) => `${relative(process.cwd(), ruta)}: ${t.trim()}`),
      ),
    )
    expect(hallazgos).toEqual([])
  })
})
