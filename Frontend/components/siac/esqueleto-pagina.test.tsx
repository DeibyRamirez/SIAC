import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { EsqueletoPagina } from '@/components/siac/esqueleto-pagina'

function directoriosConPagina(dir: string): string[] {
  const salida: string[] = []
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) {
      // api: sin UI; login: el login demo no se modifica.
      if (nombre === 'api' || nombre === 'login') continue
      salida.push(...directoriosConPagina(ruta))
    } else if (nombre === 'page.tsx') {
      salida.push(dir)
    }
  }
  return salida
}

describe('EsqueletoPagina', () => {
  it('es accesible y respeta la variante', () => {
    render(<EsqueletoPagina variante="detalle" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByTestId('esqueleto-detalle')).toBeInTheDocument()
    expect(screen.getByText('Cargando la página…')).toBeInTheDocument()
  })

  it('cada página del proyecto tiene su loading.tsx', () => {
    const sinEsqueleto = directoriosConPagina(join(process.cwd(), 'app')).filter(
      (d) => !existsSync(join(d, 'loading.tsx')),
    )
    expect(sinEsqueleto).toEqual([])
  })
})
