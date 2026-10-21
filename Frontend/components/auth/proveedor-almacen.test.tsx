import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ProveedorAlmacen,
  usarAlmacen,
  type ListaAlmacen,
} from '@/components/auth/proveedor-almacen'

vi.mock('@/components/auth/proveedor-sesion', () => ({
  usarSesion: () => ({ sesion: { usuarioId: 'u-admin', rol: 'Administrador' } }),
}))

vi.mock('@/lib/servicios/programas.servicio', () => ({
  listarProgramasApi: vi.fn(),
  listarVigenciasApi: vi.fn(),
  listarNotificacionesApi: vi.fn(),
  marcarNotificacionLeidaApi: vi.fn(),
  marcarTodasNotificacionesLeidasApi: vi.fn(),
}))

vi.mock('@/lib/servicios/evidencias.servicio', () => ({
  listarEvidenciasApi: vi.fn(),
  crearEvidenciaApi: vi.fn(),
}))

vi.mock('@/lib/servicios/plantillas.servicio', () => ({
  listarPlantillasApi: vi.fn(),
  crearPlantillaApi: vi.fn(),
  eliminarPlantillaApi: vi.fn(),
}))

import { listarEvidenciasApi } from '@/lib/servicios/evidencias.servicio'
import { listarPlantillasApi } from '@/lib/servicios/plantillas.servicio'
import {
  listarNotificacionesApi,
  listarProgramasApi,
  listarVigenciasApi,
} from '@/lib/servicios/programas.servicio'
import type { Plantilla, Programa } from '@/lib/tipos'

const evidenciasMock = vi.mocked(listarEvidenciasApi)
const plantillasMock = vi.mocked(listarPlantillasApi)
const vigenciasMock = vi.mocked(listarVigenciasApi)
const notificacionesMock = vi.mocked(listarNotificacionesApi)
const programasMock = vi.mocked(listarProgramasApi)

const PLANTILLA = { id: 'pl-1', nombre: 'G1 Documento maestro' } as Plantilla
const PROGRAMA = { id: 'p-1', nombre: 'Derecho' } as Programa

/** Promesa controlable desde la prueba para simular respuestas que tardan. */
function diferida<T>() {
  let resolver!: (valor: T) => void
  let rechazar!: (error: unknown) => void
  const promesa = new Promise<T>((res, rej) => {
    resolver = res
    rechazar = rej
  })
  return { promesa, resolver, rechazar }
}

/** Muestra el estado de una lista del proveedor como texto para inspeccionarlo. */
function Sonda({ lista }: { lista: ListaAlmacen }) {
  const { datos, estadoListas, recargarLista } = usarAlmacen()
  const estado = estadoListas[lista]
  return (
    <div>
      <p data-testid={`${lista}-cargando`}>{String(estado.cargando)}</p>
      <p data-testid={`${lista}-error`}>{estado.error ?? ''}</p>
      <p data-testid={`${lista}-total`}>{datos[lista].length}</p>
      <button type="button" onClick={() => void recargarLista(lista)}>
        recargar {lista}
      </button>
    </div>
  )
}

function renderizar(...listas: ListaAlmacen[]) {
  return render(
    <ProveedorAlmacen>
      {listas.map((lista) => (
        <Sonda key={lista} lista={lista} />
      ))}
    </ProveedorAlmacen>,
  )
}

describe('ProveedorAlmacen: carga independiente por lista', () => {
  beforeEach(() => {
    evidenciasMock.mockResolvedValue({ datos: [], total: 0, pagina: 1, limite: 100 } as never)
    plantillasMock.mockResolvedValue([PLANTILLA])
    vigenciasMock.mockResolvedValue([])
    notificacionesMock.mockResolvedValue([])
    programasMock.mockResolvedValue([PROGRAMA])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('publica cada lista en cuanto resuelve, sin esperar a una petición lenta', async () => {
    const evidenciasLentas = diferida<never>()
    evidenciasMock.mockReturnValue(evidenciasLentas.promesa)

    renderizar('plantillas', 'evidencias')

    // Plantillas ya está lista aunque evidencias siga pendiente.
    await waitFor(() => expect(screen.getByTestId('plantillas-total')).toHaveTextContent('1'))
    expect(screen.getByTestId('plantillas-cargando')).toHaveTextContent('false')
    expect(screen.getByTestId('evidencias-cargando')).toHaveTextContent('true')

    await act(async () => {
      evidenciasLentas.resolver({ datos: [], total: 0, pagina: 1, limite: 100 } as never)
    })
    await waitFor(() =>
      expect(screen.getByTestId('evidencias-cargando')).toHaveTextContent('false'),
    )
  })

  it('reintenta una vez una petición fallida y, si el reintento funciona, no muestra error', async () => {
    plantillasMock.mockRejectedValueOnce(new Error('arranque en frío'))

    renderizar('plantillas')

    await waitFor(() => expect(screen.getByTestId('plantillas-total')).toHaveTextContent('1'))
    expect(screen.getByTestId('plantillas-error')).toBeEmptyDOMElement()
    expect(plantillasMock).toHaveBeenCalledTimes(2)
  })

  it('tras dos fallos expone el error de esa lista y deja las demás cargadas', async () => {
    plantillasMock.mockRejectedValue(new Error('caída'))

    renderizar('plantillas', 'programas')

    await waitFor(() =>
      expect(screen.getByTestId('plantillas-error')).toHaveTextContent(
        'No se pudieron cargar las plantillas.',
      ),
    )
    expect(plantillasMock).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('plantillas-cargando')).toHaveTextContent('false')
    expect(screen.getByTestId('programas-total')).toHaveTextContent('1')
    expect(screen.getByTestId('programas-error')).toBeEmptyDOMElement()
  })

  it('recargarLista vuelve a pedir solo esa lista y limpia el error', async () => {
    plantillasMock.mockRejectedValue(new Error('caída'))
    renderizar('plantillas')
    await waitFor(() =>
      expect(screen.getByTestId('plantillas-error')).not.toBeEmptyDOMElement(),
    )
    const llamadasProgramas = programasMock.mock.calls.length

    plantillasMock.mockReset()
    plantillasMock.mockResolvedValue([PLANTILLA])
    await userEvent.click(screen.getByRole('button', { name: 'recargar plantillas' }))

    await waitFor(() => expect(screen.getByTestId('plantillas-total')).toHaveTextContent('1'))
    expect(screen.getByTestId('plantillas-error')).toBeEmptyDOMElement()
    expect(plantillasMock).toHaveBeenCalledTimes(1)
    expect(programasMock).toHaveBeenCalledTimes(llamadasProgramas)
  })
})
