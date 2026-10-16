import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ContenedorInformePowerBi } from '@/components/siac/contenedor-informe-powerbi'
import { RejillaInformesPowerBi } from '@/components/siac/rejilla-informes-powerbi'
import { buscarCategoriaPowerBi, type InformePowerBi } from '@/lib/informes-powerbi'
import { categoriasInformesPowerBi } from '@/lib/informes-powerbi'
import { useUrlPublicaPowerBi } from '@/lib/powerbi/use-url-publica-powerbi'

vi.mock('@/components/auth/proveedor-almacen', () => ({
  usarAlmacen: () => ({ datos: { programas: [] } }),
}))

vi.mock('@/lib/servicios/programas.servicio', () => ({
  obtenerEmbedPowerBiApi: vi.fn(() => new Promise(() => undefined)),
}))

const URL_EGRESADOS = 'https://app.powerbi.com/view?r=pruebaEgresados'
const URL_ESTUDIANTES = 'https://app.powerbi.com/view?r=pruebaEstudiantes'

function metadatosDesdeMapa(configurados: Record<string, boolean>) {
  return categoriasInformesPowerBi.map((c) => ({
    categoriaId: c.id,
    configurado: configurados[c.id] ?? false,
    urlHash: configurados[c.id] ? 'hashprueba' : null,
    activo: configurados[c.id] ?? false,
    updatedAt: null,
  }))
}

const listarInformesPowerBiApi = vi.fn()
const obtenerUrlInformePowerBiApi = vi.fn()

vi.mock('@/lib/servicios/powerbi.servicio', () => ({
  listarInformesPowerBiApi: (...args: unknown[]) => listarInformesPowerBiApi(...args),
  obtenerUrlInformePowerBiApi: (...args: unknown[]) => obtenerUrlInformePowerBiApi(...args),
}))

const powerBiHook = vi.hoisted(() => ({
  impl: null as typeof useUrlPublicaPowerBi | null,
}))

vi.mock('@/lib/powerbi/use-url-publica-powerbi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/powerbi/use-url-publica-powerbi')>()
  powerBiHook.impl = actual.useUrlPublicaPowerBi
  return {
    ...actual,
    useUrlPublicaPowerBi: vi.fn(actual.useUrlPublicaPowerBi),
  }
})

function categoria(id: string): InformePowerBi {
  const encontrada = buscarCategoriaPowerBi(id)
  if (!encontrada) throw new Error(`Categoría ${id} no existe`)
  return encontrada
}

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  if (powerBiHook.impl) {
    vi.mocked(useUrlPublicaPowerBi).mockImplementation(powerBiHook.impl)
  }
})

describe('RejillaInformesPowerBi', () => {
  it('muestra una tarjeta por cada una de las 8 categorías', async () => {
    listarInformesPowerBiApi.mockResolvedValue(metadatosDesdeMapa({}))
    render(<RejillaInformesPowerBi modo="publico" />)
    for (const titulo of [
      'Aseguramiento',
      'Infraestructura',
      'Egresados',
      'Investigación',
      'Profesores',
      'Estudiantes',
      'Bienestar',
      'Relaciones con el entorno',
    ]) {
      expect(screen.getByRole('heading', { name: titulo })).toBeInTheDocument()
    }
    expect(screen.getAllByRole('button')).toHaveLength(8)
  })

  it('marca como no publicadas las tarjetas sin URL en servidor', async () => {
    listarInformesPowerBiApi.mockResolvedValue(
      metadatosDesdeMapa({ egresados: true }),
    )
    render(<RejillaInformesPowerBi modo="publico" />)
    await waitFor(() => {
      expect(screen.getAllByText('Informe aún no publicado')).toHaveLength(7)
    })
  })

  it('abre el informe dentro de SIAC al seleccionar la tarjeta', async () => {
    listarInformesPowerBiApi.mockResolvedValue(
      metadatosDesdeMapa({ egresados: true }),
    )
    obtenerUrlInformePowerBiApi.mockResolvedValue({
      categoriaId: 'egresados',
      url: URL_EGRESADOS,
      urlHash: 'hash',
    })
    render(<RejillaInformesPowerBi modo="publico" />)
    await waitFor(() => {
      expect(listarInformesPowerBiApi).toHaveBeenCalled()
    })
    fireEvent.click(screen.getByRole('heading', { name: 'Egresados' }))
    await waitFor(() => {
      expect(screen.getByTitle('Informe Power BI — Egresados')).toHaveAttribute(
        'src',
        URL_EGRESADOS,
      )
    })
  })
})

describe('ContenedorInformePowerBi (modo publico)', () => {
  it('sin URL muestra «Informe aún no publicado»', async () => {
    obtenerUrlInformePowerBiApi.mockRejectedValue(new Error('404'))
    render(<ContenedorInformePowerBi informe={categoria('profesores')} modo="publico" />)
    await waitFor(() => {
      expect(screen.getByText('Informe aún no publicado')).toBeInTheDocument()
    })
    expect(screen.queryByTitle(/Informe Power BI/)).not.toBeInTheDocument()
    expect(screen.getByText(/administrador del SIAC/)).toBeInTheDocument()
  })

  it('rechaza una URL que no es de «Publicar en la web»', async () => {
    obtenerUrlInformePowerBiApi.mockResolvedValue({
      categoriaId: 'investigacion',
      url: 'https://ejemplo.com/view?r=abc',
      urlHash: 'hash',
    })
    render(<ContenedorInformePowerBi informe={categoria('investigacion')} modo="publico" />)
    await waitFor(() => {
      expect(screen.getByText('Informe aún no publicado')).toBeInTheDocument()
    })
    expect(screen.getByText(/no es una URL pública válida/)).toBeInTheDocument()
    expect(screen.queryByTitle(/Informe Power BI/)).not.toBeInTheDocument()
  })

  it('pasa la URL correcta al iframe con título accesible, lazy y pantalla completa', async () => {
    obtenerUrlInformePowerBiApi.mockResolvedValue({
      categoriaId: 'estudiantes',
      url: URL_ESTUDIANTES,
      urlHash: 'hash',
    })
    render(<ContenedorInformePowerBi informe={categoria('estudiantes')} modo="publico" />)
    const iframe = await screen.findByTitle('Informe Power BI — Estudiantes')
    expect(iframe.tagName).toBe('IFRAME')
    expect(iframe).toHaveAttribute('src', URL_ESTUDIANTES)
    expect(iframe).toHaveAttribute('loading', 'lazy')
    expect(iframe).toHaveAttribute('allowfullscreen')
  })

  it('si el iframe tarda demasiado muestra error y permite reintentar', () => {
    vi.useFakeTimers()
    vi.mocked(useUrlPublicaPowerBi).mockReturnValue({
      estado: 'publicada',
      url: URL_ESTUDIANTES,
    })
    render(
      <ContenedorInformePowerBi
        informe={categoria('estudiantes')}
        modo="publico"
        tiempoMaximoCargaMs={1000}
      />,
    )
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.queryByTitle(/Informe Power BI/)).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/tardó demasiado/)
    expect(screen.getByText(/actualizar la URL/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    const iframe = screen.getByTitle('Informe Power BI — Estudiantes')
    expect(iframe).toHaveAttribute('src', URL_ESTUDIANTES)

    fireEvent.load(iframe)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByTitle('Informe Power BI — Estudiantes')).toBeInTheDocument()
  })
})

describe('ContenedorInformePowerBi (modo embebido bloqueado)', () => {
  it('conserva la ruta simulada y no usa la URL pública', () => {
    obtenerUrlInformePowerBiApi.mockResolvedValue({
      categoriaId: 'estudiantes',
      url: URL_ESTUDIANTES,
      urlHash: 'hash',
    })
    render(<ContenedorInformePowerBi informe={categoria('estudiantes')} modo="embebido" />)
    expect(screen.getByText(/Preparando informe de Power BI/)).toBeInTheDocument()
    expect(screen.queryByTitle(/Informe Power BI/)).not.toBeInTheDocument()
  })
})
