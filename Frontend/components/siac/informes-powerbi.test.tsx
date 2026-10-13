import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ContenedorInformePowerBi } from '@/components/siac/contenedor-informe-powerbi'
import { RejillaInformesPowerBi } from '@/components/siac/rejilla-informes-powerbi'
import { buscarCategoriaPowerBi, type InformePowerBi } from '@/lib/informes-powerbi'

vi.mock('@/components/auth/proveedor-almacen', () => ({
  usarAlmacen: () => ({ datos: { programas: [] } }),
}))

vi.mock('@/components/siac/panel-cifras-categoria', () => ({
  PanelCifrasCategoria: ({
    categoriaId,
    mensajeEncabezado,
  }: {
    categoriaId: string
    mensajeEncabezado?: string
  }) => (
    <div data-testid="respaldo-recharts" data-categoria-id={categoriaId}>
      {mensajeEncabezado}
    </div>
  ),
}))

vi.mock('@/lib/servicios/programas.servicio', () => ({
  obtenerEmbedPowerBiApi: vi.fn(() => new Promise(() => undefined)),
}))

const URL_EGRESADOS = 'https://app.powerbi.com/view?r=pruebaEgresados'
const URL_ESTUDIANTES = 'https://app.powerbi.com/view?r=pruebaEstudiantes'

function categoria(id: string): InformePowerBi {
  const encontrada = buscarCategoriaPowerBi(id)
  if (!encontrada) throw new Error(`Categoría ${id} no existe`)
  return encontrada
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('RejillaInformesPowerBi', () => {
  it('muestra una tarjeta por cada una de las 6 categorías', () => {
    render(<RejillaInformesPowerBi modo="publico" />)
    for (const titulo of [
      'Aseguramiento',
      'Infraestructura',
      'Egresados',
      'Investigación',
      'Profesores',
      'Estudiantes',
    ]) {
      expect(screen.getByRole('heading', { name: titulo })).toBeInTheDocument()
    }
    expect(screen.getAllByRole('button')).toHaveLength(6)
  })

  it('marca como no publicadas las tarjetas sin URL', () => {
    vi.stubEnv('NEXT_PUBLIC_POWERBI_URL_EGRESADOS', URL_EGRESADOS)
    render(<RejillaInformesPowerBi modo="publico" />)
    expect(screen.getAllByText('Informe aún no publicado')).toHaveLength(5)
  })

  it('abre el informe dentro de SIAC al seleccionar la tarjeta', () => {
    vi.stubEnv('NEXT_PUBLIC_POWERBI_URL_EGRESADOS', URL_EGRESADOS)
    render(<RejillaInformesPowerBi modo="publico" />)
    fireEvent.click(screen.getByRole('heading', { name: 'Egresados' }))
    expect(screen.getByTitle('Informe Power BI — Egresados')).toHaveAttribute('src', URL_EGRESADOS)
  })
})

describe('ContenedorInformePowerBi (modo publico)', () => {
  it('sin URL muestra «Informe aún no publicado» y el panel de cifras de la categoría', () => {
    vi.stubEnv('NEXT_PUBLIC_POWERBI_URL_PROFESORES', '')
    render(<ContenedorInformePowerBi informe={categoria('profesores')} modo="publico" />)
    expect(screen.getByText('Informe aún no publicado')).toBeInTheDocument()
    expect(screen.queryByTitle(/Informe Power BI/)).not.toBeInTheDocument()
    expect(screen.getByTestId('respaldo-recharts')).toHaveAttribute(
      'data-categoria-id',
      'profesores',
    )
  })

  it('sin URL y sin respaldo solo muestra «Informe aún no publicado»', () => {
    vi.stubEnv('NEXT_PUBLIC_POWERBI_URL_EGRESADOS', '')
    render(
      <ContenedorInformePowerBi
        informe={{ ...categoria('egresados'), tieneRespaldoRecharts: false }}
        modo="publico"
      />,
    )
    expect(screen.getByText('Informe aún no publicado')).toBeInTheDocument()
    expect(screen.queryByTestId('respaldo-recharts')).not.toBeInTheDocument()
  })

  it('rechaza una URL que no es de «Publicar en la web»', () => {
    vi.stubEnv('NEXT_PUBLIC_POWERBI_URL_INVESTIGACION', 'https://ejemplo.com/view?r=abc')
    render(<ContenedorInformePowerBi informe={categoria('investigacion')} modo="publico" />)
    expect(screen.getByText('Informe aún no publicado')).toBeInTheDocument()
    expect(screen.getByText(/no es una URL pública válida/)).toBeInTheDocument()
    expect(screen.queryByTitle(/Informe Power BI/)).not.toBeInTheDocument()
  })

  it('pasa la URL correcta al iframe con título accesible, lazy y pantalla completa', () => {
    vi.stubEnv('NEXT_PUBLIC_POWERBI_URL_ESTUDIANTES', URL_ESTUDIANTES)
    render(<ContenedorInformePowerBi informe={categoria('estudiantes')} modo="publico" />)
    const iframe = screen.getByTitle('Informe Power BI — Estudiantes')
    expect(iframe.tagName).toBe('IFRAME')
    expect(iframe).toHaveAttribute('src', URL_ESTUDIANTES)
    expect(iframe).toHaveAttribute('loading', 'lazy')
    expect(iframe).toHaveAttribute('allowfullscreen')
  })

  it('si el iframe tarda demasiado muestra el respaldo y permite reintentar', () => {
    vi.useFakeTimers()
    vi.stubEnv('NEXT_PUBLIC_POWERBI_URL_ESTUDIANTES', URL_ESTUDIANTES)
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
    expect(screen.getByTestId('respaldo-recharts')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    const iframe = screen.getByTitle('Informe Power BI — Estudiantes')
    expect(iframe).toHaveAttribute('src', URL_ESTUDIANTES)

    fireEvent.load(iframe)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByTitle('Informe Power BI — Estudiantes')).toBeInTheDocument()
  })

  it('en categorías sin respaldo el error indica que no hay vista alternativa', () => {
    vi.useFakeTimers()
    vi.stubEnv('NEXT_PUBLIC_POWERBI_URL_EGRESADOS', URL_EGRESADOS)
    render(
      <ContenedorInformePowerBi
        informe={{ ...categoria('egresados'), tieneRespaldoRecharts: false }}
        modo="publico"
        tiempoMaximoCargaMs={500}
      />,
    )
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument()
    expect(screen.getByText(/aún no tiene una vista alternativa/)).toBeInTheDocument()
  })
})

describe('ContenedorInformePowerBi (modo embebido bloqueado)', () => {
  it('conserva la ruta simulada y no usa la URL pública', () => {
    vi.stubEnv('NEXT_PUBLIC_POWERBI_URL_ESTUDIANTES', URL_ESTUDIANTES)
    render(<ContenedorInformePowerBi informe={categoria('estudiantes')} modo="embebido" />)
    expect(screen.getByText(/Preparando informe de Power BI/)).toBeInTheDocument()
    expect(screen.queryByTitle(/Informe Power BI/)).not.toBeInTheDocument()
  })
})
