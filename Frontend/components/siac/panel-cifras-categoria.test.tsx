import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RespuestaCifras } from '@/lib/tipos/cifras'

const { replaceMock, estado, obtenerCifrasCategoriaApi, obtenerFiltrosCifrasApi } = vi.hoisted(
  () => ({
    replaceMock: vi.fn(),
    estado: { rol: 'Administrador', params: '' },
    obtenerCifrasCategoriaApi: vi.fn(),
    obtenerFiltrosCifrasApi: vi.fn(),
  }),
)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/administrador/dashboard',
  useSearchParams: () => new URLSearchParams(estado.params),
}))

vi.mock('@/components/auth/proveedor-sesion', () => ({
  usarSesion: () => ({ sesion: { rol: estado.rol, usuarioId: 'u-1', nombre: 'Demo' } }),
}))

vi.mock('@/lib/servicios/cifras.servicio', () => ({
  obtenerCifrasCategoriaApi,
  obtenerFiltrosCifrasApi,
  descargarPlantillaCifrasApi: vi.fn(),
  descargarPlantillaJsonCifrasApi: vi.fn(),
  importarCifrasExcelApi: vi.fn(),
}))

import { PanelCifrasCategoria } from '@/components/siac/panel-cifras-categoria'

const FILTROS_COMPLETOS = {
  periodos: ['2023-2'],
  facultades: ['Facultad de Ciencias Agrarias', 'Facultad de Ciencias de la Salud'],
  programas: ['Ingeniería Agropecuaria', 'Medicina'],
  sedes: [],
}

function respuestaBase(overrides: Partial<RespuestaCifras> = {}): RespuestaCifras {
  return {
    meta: {
      categoriaId: 'profesores',
      titulo: 'Profesores',
      periodo: '2023-2',
      actualizadoEn: '2026-10-12T15:00:00.000Z',
      fuente: 'EXCEL',
    },
    indicadores: [],
    series: [],
    periodosDisponibles: ['2023-2'],
    ...overrides,
  }
}

describe('PanelCifrasCategoria — filtros (fix S3-03)', () => {
  beforeEach(() => {
    estado.rol = 'Administrador'
    estado.params = ''
    replaceMock.mockClear()
    obtenerCifrasCategoriaApi.mockReset()
    obtenerFiltrosCifrasApi.mockReset()
    obtenerFiltrosCifrasApi.mockResolvedValue(FILTROS_COMPLETOS)
    obtenerCifrasCategoriaApi.mockResolvedValue(respuestaBase())
  })

  it('puebla los selects con las opciones reales de /filtros', async () => {
    const usuario = userEvent.setup()
    render(<PanelCifrasCategoria categoriaId="profesores" />)

    await waitFor(() => {
      expect(obtenerFiltrosCifrasApi).toHaveBeenCalledWith('profesores', {})
    })

    await usuario.click(screen.getByLabelText('Filtrar por facultad'))
    expect(
      await screen.findByRole('option', { name: 'Facultad de Ciencias de la Salud' }),
    ).toBeInTheDocument()
    await usuario.keyboard('{Escape}')

    await usuario.click(screen.getByLabelText('Filtrar por programa'))
    expect(
      await screen.findByRole('option', { name: 'Ingeniería Agropecuaria' }),
    ).toBeInTheDocument()
  })

  it('al cambiar la facultad resetea el programa a «todos» en la URL', async () => {
    estado.params =
      'facultad=Facultad+de+Ciencias+Agrarias&programa=Ingenier%C3%ADa+Agropecuaria'
    const usuario = userEvent.setup()
    render(<PanelCifrasCategoria categoriaId="profesores" />)

    await usuario.click(await screen.findByLabelText('Filtrar por facultad'))
    await usuario.click(
      await screen.findByRole('option', { name: 'Facultad de Ciencias de la Salud' }),
    )

    await waitFor(() => expect(replaceMock).toHaveBeenCalled())
    const url = String(replaceMock.mock.calls.at(-1)?.[0])
    expect(url).toContain('facultad=Facultad+de+Ciencias+de+la+Salud')
    expect(url).not.toContain('programa=')
  })

  it('con sinCoincidencias muestra «Limpiar filtros» y no ofrece importar', async () => {
    estado.params = 'facultad=Facultad+Inexistente'
    obtenerFiltrosCifrasApi.mockResolvedValue({
      ...FILTROS_COMPLETOS,
      facultades: ['Facultad de Ciencias Agrarias'],
    })
    obtenerCifrasCategoriaApi.mockResolvedValue(
      respuestaBase({
        meta: {
          categoriaId: 'profesores',
          titulo: 'Profesores',
          periodo: '2023-2',
          actualizadoEn: '2026-10-12T15:00:00.000Z',
          fuente: 'EXCEL',
          sinCoincidencias: true,
        },
      }),
    )
    const usuario = userEvent.setup()
    render(<PanelCifrasCategoria categoriaId="profesores" />)

    expect(
      await screen.findByText('No hay datos para los filtros seleccionados'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Importar Excel/i })).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(replaceMock).toHaveBeenCalledWith('/administrador/dashboard', { scroll: false })
  })

  it('sin registros en la categoría mantiene el estado vacío con importar', async () => {
    obtenerFiltrosCifrasApi.mockResolvedValue({
      periodos: [],
      facultades: [],
      programas: [],
      sedes: [],
    })
    obtenerCifrasCategoriaApi.mockResolvedValue(
      respuestaBase({ periodosDisponibles: [] }),
    )
    render(<PanelCifrasCategoria categoriaId="profesores" />)

    expect(
      await screen.findByText('Aún no hay cifras cargadas para esta categoría y periodo'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Importar Excel/i }).length).toBeGreaterThan(0)
  })

  it('limpia de la URL un valor que no existe en las opciones', async () => {
    estado.params = 'facultad=Facultad+Inexistente'
    obtenerFiltrosCifrasApi.mockResolvedValue(FILTROS_COMPLETOS)
    render(<PanelCifrasCategoria categoriaId="profesores" />)

    await waitFor(() => expect(replaceMock).toHaveBeenCalled())
    expect(String(replaceMock.mock.calls[0][0])).toBe('/administrador/dashboard')
  })

  it('renderiza KPI y gráfico de barras con datos reales del API', async () => {
    obtenerCifrasCategoriaApi.mockResolvedValue(
      respuestaBase({
        indicadores: [
          {
            id: 'total_profesores',
            clave: 'total_profesores',
            etiqueta: 'Total profesores',
            unidad: 'conteo',
            formato: 'entero',
            total: 1351,
            valor: 1351,
            fuente: 'EXCEL',
            desglose: [
              { dimension: 'facultad', valorDimension: 'Facultad de Ciencias Agrarias', facultad: 'Facultad de Ciencias Agrarias', valor: 300 },
              { dimension: 'facultad', valorDimension: 'Facultad de Ciencias de la Salud', facultad: 'Facultad de Ciencias de la Salud', valor: 260 },
            ],
          },
        ],
      }),
    )

    render(<PanelCifrasCategoria categoriaId="profesores" />)

    expect(await screen.findByText('1.351')).toBeInTheDocument()
    expect(screen.getByText('Por Facultad')).toBeInTheDocument()
    expect(document.querySelector('.recharts-responsive-container')).not.toBeNull()
  })

  it('sin rol Administrador no ofrece Importar Excel', async () => {
    estado.rol = 'Revisor'
    render(<PanelCifrasCategoria categoriaId="profesores" />)

    expect(
      await screen.findByText('Aún no hay cifras cargadas para esta categoría y periodo'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Importar Excel/i })).not.toBeInTheDocument()
  })

  it('muestra el mensaje del backend cuando la consulta falla', async () => {
    obtenerCifrasCategoriaApi.mockRejectedValue(
      new Error('El periodo debe tener formato AAAA-S (ej. 2026-1) o AAAA.'),
    )

    render(<PanelCifrasCategoria categoriaId="profesores" />)

    expect(
      await screen.findByText('El periodo debe tener formato AAAA-S (ej. 2026-1) o AAAA.'),
    ).toBeInTheDocument()
  })
})
