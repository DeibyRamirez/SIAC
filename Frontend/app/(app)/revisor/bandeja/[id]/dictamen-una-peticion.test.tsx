import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'ev-g2' }),
  useRouter: () => ({ push }),
  usePathname: () => '/revisor/bandeja/ev-g2',
}))

vi.mock('@/components/layout/shell-aplicacion', () => ({
  PlantillaPaginaApp: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/auth/proveedor-sesion', () => ({
  usarSesion: () => ({
    sesion: { usuarioId: 'rev-1', rol: 'Revisor', nombre: 'Revisor', correo: 'r@x.co' },
  }),
}))

vi.mock('@/components/siac/visor-documento-inline', () => ({
  VisorDocumentoInline: () => <div data-testid="visor" />,
}))

vi.mock('@/components/siac/historial-versiones-evidencia', () => ({
  HistorialVersionesEvidencia: () => null,
}))

vi.mock('@/lib/hooks/usar-borrador-revision-docx', () => ({
  usarBorradorRevisionDocx: () => undefined,
  limpiarBorradorRevision: vi.fn(),
}))

const evidenciaEnRevision = {
  id: 'ev-g2',
  nombre: 'G2 Respaldo de mejoramiento',
  programaId: 'prog-1',
  periodo: '2026-2',
  estado: 'EnRevision',
  autorId: 'car-1',
  nombreArchivo: 'g2.docx',
  fechaCarga: '2026-10-15T16:00:00.000Z',
  codigoGuia: 'G2',
  version: 1,
}

function respuestaJson(cuerpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => cuerpo,
  } as Response
}

const fetchMock = vi.fn(async (entrada: RequestInfo | URL, _init?: RequestInit) => {
  const url = String(entrada)
  if (url.includes('/dictamen')) {
    return respuestaJson({ ...evidenciaEnRevision, estado: 'Validado' })
  }
  if (url.includes('/descargar')) return respuestaJson({ url: 'blob:demo', expiraEn: 60 })
  if (url.includes('/evaluaciones-condicion')) return respuestaJson([])
  if (url.includes('/evidencias/ev-g2')) return respuestaJson(evidenciaEnRevision)
  if (url.includes('/evidencias')) {
    return respuestaJson({ datos: [], total: 0, pagina: 1, limite: 100 })
  }
  return respuestaJson([])
})

import { ProveedorAlmacen } from '@/components/auth/proveedor-almacen'
import DictamenPage from '@/app/(app)/revisor/bandeja/[id]/page'

describe('Dictamen del revisor · §5.4 una sola petición', () => {
  beforeEach(() => {
    push.mockClear()
    fetchMock.mockClear()
    vi.stubGlobal('fetch', fetchMock)
    window.localStorage.clear()
  })

  it('aprobar un G2 envía un único POST /evidencias/:id/dictamen', async () => {
    const usuario = userEvent.setup()

    render(
      <ProveedorAlmacen>
        <DictamenPage />
      </ProveedorAlmacen>,
    )

    const botonAprobar = await screen.findByRole('button', { name: /Aprobar documento/i })
    await usuario.click(botonAprobar)
    await usuario.click(await screen.findByRole('button', { name: /Sí, aprobar/i }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/revisor/bandeja'))

    const postsDictamen = fetchMock.mock.calls.filter(([url, init]) => {
      const metodo = (init?.method ?? 'GET').toUpperCase()
      return String(url).includes('/dictamen') && metodo === 'POST'
    })
    expect(postsDictamen).toHaveLength(1)
  })
})
