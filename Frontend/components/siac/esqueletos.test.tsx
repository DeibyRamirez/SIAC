import fs from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  EsqueletoContenidoPagina,
  EsqueletoPaginaApp,
  tipoEsqueletoParaRuta,
  type TipoEsqueletoPagina,
} from '@/components/siac/esqueletos-paginas'
import { MensajeCargando } from '@/components/siac/estado-carga-lista'

vi.mock('next/navigation', () => ({
  usePathname: () => '/cargador/evidencias',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))
vi.mock('@/components/auth/proveedor-sesion', () => ({
  usarSesion: () => ({ sesion: null, cargando: true }),
}))

const DIR_APP = path.join(__dirname, '..', '..', 'app', '(app)')

/** Carpetas con page.tsx dentro del grupo (app). */
function carpetasConPagina(dir: string): string[] {
  const salida: string[] = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue
    const ruta = path.join(dir, e.name)
    if (fs.existsSync(path.join(ruta, 'page.tsx'))) salida.push(ruta)
    salida.push(...carpetasConPagina(ruta))
  }
  return salida
}

const ESPERADO: Array<[string, TipoEsqueletoPagina]> = [
  ['/administrador', 'resumen'],
  ['/cargador', 'resumen'],
  ['/administrador/busqueda', 'busqueda'],
  ['/administrador/vigencias', 'vigencias'],
  ['/administrador/usuarios', 'usuarios'],
  ['/administrador/programas', 'tarjetas'],
  ['/administrador/programas/id', 'proceso'],
  ['/cargador/evidencias/nueva', 'formulario'],
  ['/cargador/evidencias/id', 'detalle'],
  ['/revisor/bandeja/id', 'detalle'],
  ['/cargador/evidencias', 'tabla'],
  ['/revisor/bandeja', 'tabla'],
]

const TIPOS: TipoEsqueletoPagina[] = [
  'resumen', 'busqueda', 'tabla', 'detalle', 'proceso', 'formulario', 'tarjetas', 'vigencias', 'usuarios',
]

describe('loading.tsx de cada página', () => {
  const carpetas = carpetasConPagina(DIR_APP)

  it('hay páginas que revisar', () => {
    expect(carpetas.length).toBeGreaterThan(10)
  })

  it.each(carpetas.map((c) => [path.relative(DIR_APP, c)]))('%s tiene loading.tsx con el esqueleto de su ruta', (rel) => {
    const archivo = path.join(DIR_APP, rel, 'loading.tsx')
    expect(fs.existsSync(archivo)).toBe(true)
    const fuente = fs.readFileSync(archivo, 'utf8')
    expect(fuente).toContain("from '@/components/siac/esqueletos-paginas'")
    const ruta = fuente.match(/EsqueletoPaginaApp ruta="([^"]+)"/)?.[1]
    const esperada = '/' + rel.split(path.sep).map((s) => s.replace(/^\[(.+)\]$/, '$1')).join('/')
    expect(ruta).toBe(esperada)
  })

  it('no existe loading.tsx en la raíz (envolvería el login)', () => {
    expect(fs.existsSync(path.join(DIR_APP, '..', 'loading.tsx'))).toBe(false)
  })
})

describe('tipoEsqueletoParaRuta', () => {
  it.each(ESPERADO)('%s → %s', (ruta, tipo) => {
    expect(tipoEsqueletoParaRuta(ruta)).toBe(tipo)
  })
})

describe('EsqueletoContenidoPagina', () => {
  it.each(TIPOS)('tipo %s nunca queda vacío y anuncia la carga', (tipo) => {
    const { container } = render(<EsqueletoContenidoPagina tipo={tipo} />)
    const raiz = screen.getByTestId(`esqueleto-${tipo}`)
    expect(raiz).toHaveAttribute('aria-busy', 'true')
    expect(raiz).toHaveTextContent('Cargando la página…')
    expect(container.querySelector('[data-esqueleto="encabezado"]')).not.toBeNull()
    expect(container.querySelectorAll('[data-esqueleto]').length).toBeGreaterThan(1)
  })

  it('las listas muestran filtros y tabla; el detalle, su bloque', () => {
    const { container, unmount } = render(<EsqueletoContenidoPagina tipo="tabla" />)
    expect(container.querySelector('[data-esqueleto="tabla"]')).not.toBeNull()
    unmount()
    const d = render(<EsqueletoContenidoPagina tipo="detalle" />)
    expect(d.container.querySelector('[data-esqueleto="detalle"]')).not.toBeNull()
  })
})

describe('EsqueletoPaginaApp', () => {
  it('incluye un solo marco (barra lateral + superior) y el contenido de la ruta', () => {
    const { container } = render(<EsqueletoPaginaApp ruta="/cargador/evidencias" />)
    expect(container.querySelectorAll('[data-esqueleto="shell"]')).toHaveLength(1)
    expect(container.querySelector('.panel-sidebar')).not.toBeNull()
    expect(container.querySelectorAll('.panel-topbar')).toHaveLength(1)
    expect(screen.getByTestId('esqueleto-tabla')).toBeInTheDocument()
  })
})

describe('estados de carga en el cliente', () => {
  it('GuardiaSesion muestra el esqueleto de la página mientras carga la sesión', async () => {
    const { GuardiaSesion } = await import('@/components/auth/guardia-sesion')
    const { container } = render(
      <GuardiaSesion rolesPermitidos={['Cargador'] as never}>
        <div>contenido</div>
      </GuardiaSesion>,
    )
    expect(screen.queryByText('contenido')).not.toBeInTheDocument()
    expect(container.querySelector('[data-esqueleto="shell"]')).not.toBeNull()
    expect(screen.getByTestId('esqueleto-tabla')).toBeInTheDocument()
  })

  it('MensajeCargando pinta una tabla esqueleto y conserva el texto accesible', () => {
    const { container } = render(<MensajeCargando texto="Cargando evidencias…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando evidencias…')
    expect(container.querySelector('[data-esqueleto="tabla"]')).not.toBeNull()
  })

  it('ninguna página de detalle deja el texto plano «Cargando evidencia…»', () => {
    for (const rel of ['administrador/evidencias/[id]', 'cargador/evidencias/[id]', 'revisor/bandeja/[id]']) {
      const fuente = fs.readFileSync(path.join(DIR_APP, rel, 'page.tsx'), 'utf8')
      expect(fuente).not.toMatch(/<p[^>]*>Cargando evidencia…<\/p>/)
      expect(fuente).toContain('<EsqueletoContenidoPagina tipo="detalle" />')
    }
  })
})
