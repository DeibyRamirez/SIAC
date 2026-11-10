import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'ev-1' }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/components/layout/shell-aplicacion', () => ({
  PlantillaPaginaApp: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/auth/proveedor-almacen', () => ({
  usarAlmacen: () => ({
    datos: { evidencias: [], programas: [] },
    actualizarEvidencia: vi.fn(),
    recargarAlertas: vi.fn(),
  }),
}))

vi.mock('docx-preview', () => ({
  renderAsync: vi.fn(async (_buffer: ArrayBuffer, contenedor: HTMLElement) => {
    contenedor.innerHTML = `
      <div class="docx-wrapper">
        <p>El documento tiene una cita uno para revisar.</p>
        <p>También aparece la cita dos en otro párrafo.</p>
        <p>Texto final sin observaciones.</p>
      </div>
    `
  }),
}))

const COMENTARIOS = [
  {
    quote: 'cita uno para revisar',
    texto: 'Mejora la redacción de la cita uno.',
  },
  {
    quote: 'cita dos en otro párrafo',
    texto: 'Amplía la cita dos con el soporte.',
  },
  {
    quote: 'fragmento que no existe en esta versión',
    texto: 'Comentario de una versión anterior.',
  },
]

function respuestaJson(cuerpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => cuerpo,
  } as unknown as Response
}

function respuestaDocx() {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (nombre: string) =>
        nombre.toLowerCase() === 'content-type'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : null,
    },
    arrayBuffer: async () => new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer,
  } as unknown as Response
}

const evidencia = {
  id: 'ev-1',
  nombre: 'G1 Documento maestro',
  programaId: 'prog-1',
  periodo: '2026-2',
  estado: 'ConObservaciones',
  autorId: 'autor-1',
  nombreArchivo: 'documento.docx',
  fechaCarga: '2026-11-08T10:00:00.000Z',
  version: 2,
  codigoGuia: 'G1',
}

const fetchMock = vi.fn(async (entrada: RequestInfo | URL) => {
  const url = String(entrada)
  if (url.includes('/contenido')) return respuestaDocx()
  if (url.includes('/comentarios')) return respuestaJson(COMENTARIOS)
  if (url.includes('/versiones')) {
    return respuestaJson([
      {
        id: 'v-2',
        evidenciaId: 'ev-1',
        numero: 2,
        nombreArchivo: 'documento.docx',
        rutaArchivo: 'e2/v2.docx',
        subidoPorId: 'rev-1',
        createdAt: '2026-11-08T10:00:00.000Z',
        firmaDescarga: 'firma-v2',
      },
    ])
  }
  if (url.includes('/descargar')) return respuestaJson({ url: 'blob:demo', expiraEn: 60 })
  if (url.includes('/historial')) return respuestaJson([])
  if (url.includes('/evaluaciones-condicion')) return respuestaJson([])
  if (url.includes('/evidencias/ev-1')) return respuestaJson(evidencia)
  return respuestaJson([])
})

import DetalleEvidenciaCargadorPage from '@/app/(app)/cargador/evidencias/[id]/page'

describe('Detalle de evidencia del profesor · comentarios con auto-scroll', () => {
  beforeEach(() => {
    fetchMock.mockClear()
    vi.stubGlobal('fetch', fetchMock)
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      writable: true,
      configurable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  async function abrirDetalle() {
    render(<DetalleEvidenciaCargadorPage />)
    await screen.findByText('Comentarios del revisor')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cita uno para revisar/i })).toBeInTheDocument()
    })
  }

  it('clic en un comentario hace scroll y marca la cita; otro comentario reemplaza la marca', { timeout: 15_000 }, async () => {
    const usuario = userEvent.setup()
    await abrirDetalle()

    await usuario.click(screen.getByRole('button', { name: /cita uno para revisar/i }))
    await waitFor(() => {
      expect(document.querySelector('mark[data-siac-cita]')?.textContent).toContain(
        'cita uno para revisar',
      )
    })
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: /cita dos en otro párrafo/i }))
    await waitFor(() => {
      const marcas = document.querySelectorAll('mark[data-siac-cita]')
      expect(marcas).toHaveLength(1)
      expect(marcas[0].textContent).toContain('cita dos en otro párrafo')
    })
  })

  it('avisa cuando la cita ya no aparece en la versión mostrada', { timeout: 15_000 }, async () => {
    const usuario = userEvent.setup()
    await abrirDetalle()

    await usuario.click(screen.getByRole('button', { name: /Comentario de una versión anterior/i }))

    expect(
      await screen.findByText('No se encontró el fragmento en esta versión'),
    ).toBeVisible()
    expect(document.querySelector('mark[data-siac-cita]')).toBeNull()
  })
})
