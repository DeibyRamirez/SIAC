import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const reemplazar = vi.fn()
const refrescar = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: reemplazar, refresh: refrescar }),
}))

vi.mock('@/lib/servicios/cliente-api', () => ({ apiDisponible: () => false }))
vi.mock('@/lib/servicios/integracion.servicio', () => ({ sincronizarCarrerasApi: vi.fn() }))
vi.mock('@/components/auth/proveedor-sesion', () => ({
  usarSesion: () => ({ sesion: { rol: 'Administrador' } }),
}))

import { PanelProgramasCliente } from '@/components/siac/panel-programas-cliente'
import type { FilaPanelPrograma } from '@/lib/servicios/panel-programas.servicio'
import { leerFiltrosPanelUrl } from '@/lib/utilidades/parametros-panel-url'

function fila(parcial: Partial<FilaPanelPrograma> = {}): FilaPanelPrograma {
  return {
    id: 'p1',
    nombre: 'Derecho',
    codigo: 'DER',
    alcance: 'Programa',
    tipoTramite: 'RenovacionRegistroCalificado',
    avancePorcentual: 80,
    semaforoAvance: 'Amarillo',
    semaforoVigencia: 'SinVigencia',
    semaforoGeneral: 'Amarillo',
    documentos: [
      { codigoGuia: 'G1', nombre: 'DM', puntaje: 8, totalCondiciones: 9, porcentajeInterno: 88.89, peso: 90, aportacion: 80, revisado: true },
      { codigoGuia: 'G2', nombre: 'RM', puntaje: null, totalCondiciones: null, porcentajeInterno: 0, peso: 10, aportacion: 0, revisado: false },
    ],
    anexoInfraestructuraVencido: false,
    fechaResolucion: null,
    fechaFinVigencia: null,
    semestre: '2026-2',
    activo: true,
    ...parcial,
  }
}

describe('PanelProgramasCliente (R-010.3)', () => {
  beforeEach(() => {
    reemplazar.mockClear()
  })

  it('muestra n/9, semestre y «Sin resolución» / «Sin vigencia» con los datos del servidor', () => {
    render(
      <PanelProgramasCliente
        filtros={leerFiltrosPanelUrl({})}
        datos={{ datos: [fila()], total: 1, page: 1, limit: 12, totalPaginas: 1 }}
        institucion={null}
        errorCarga={null}
      />,
    )

    expect(screen.getByText('G1 8/9')).toBeInTheDocument()
    expect(screen.getByText('G2 sin revisar')).toBeInTheDocument()
    expect(screen.getByText('2026-2')).toBeInTheDocument()
    expect(screen.getByText('Sin resolución')).toBeInTheDocument()
    expect(screen.getByText('Sin vigencia')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('muestra la fecha de resolución cuando existe', () => {
    render(
      <PanelProgramasCliente
        filtros={leerFiltrosPanelUrl({})}
        datos={{
          datos: [fila({ fechaResolucion: '2020-03-01T00:00:00.000Z', semaforoVigencia: 'Amarillo' })],
          total: 1,
          page: 1,
          limit: 12,
          totalPaginas: 1,
        }}
        institucion={null}
        errorCarga={null}
      />,
    )

    expect(screen.getByText(/01.*2020/)).toBeInTheDocument()
  })

  it('la búsqueda actualiza la URL (el servidor vuelve a renderizar) y reinicia la página', async () => {
    const usuario = userEvent.setup()
    render(
      <PanelProgramasCliente
        filtros={leerFiltrosPanelUrl({ pagina: '3' })}
        datos={{ datos: [fila()], total: 40, page: 3, limit: 12, totalPaginas: 4 }}
        institucion={null}
        errorCarga={null}
      />,
    )

    await usuario.type(screen.getByPlaceholderText('Buscar por nombre o código…'), 'der')

    await vi.waitFor(() =>
      expect(reemplazar).toHaveBeenLastCalledWith('/administrador/programas?q=der', { scroll: false }),
    )
  })

  it('muestra el error de carga del SSR', () => {
    render(
      <PanelProgramasCliente
        filtros={leerFiltrosPanelUrl({})}
        datos={{ datos: [], total: 0, page: 1, limit: 12, totalPaginas: 0 }}
        institucion={null}
        errorCarga="No hay conexión con la API."
      />,
    )
    expect(screen.getByText('No hay conexión con la API.')).toBeInTheDocument()
  })
})
