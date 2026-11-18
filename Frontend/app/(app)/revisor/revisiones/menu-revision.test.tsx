import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listar = vi.fn()

vi.mock('@/components/layout/shell-aplicacion', () => ({
  PlantillaPaginaApp: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/lib/servicios/evidencias.servicio', () => ({
  listarMisRevisionesRevisorApi: (...args: unknown[]) => listar(...args),
}))
vi.mock('@/components/siac/panel-observaciones-revision', () => ({
  PanelObservacionesRevision: () => <div>Vista de observaciones</div>,
}))
import MisRevisionesPage from '@/app/(app)/revisor/revisiones/page'

const FILA = {
  evidenciaId: 'ev-1',
  nombre: 'G1 Documento maestro',
  estado: 'ConObservaciones',
  version: 2,
  numeroRevision: 2,
  fechaEnvioRevision: '2026-11-08T10:00:00.000Z',
  tipoEnvio: 'correccion',
  observacionesDictamen: 'Ajustar el soporte.',
  programa: { id: 'p-1', nombre: 'Ingeniería' },
}

describe('Mis revisiones · menú de acciones', () => {
  beforeEach(() => {
    listar.mockReset()
    listar.mockResolvedValue({ datos: [FILA], total: 1, pagina: 1, limite: 10 })
  })

  it('ofrece Observaciones e Historial en un menú accesible', async () => {
    render(<MisRevisionesPage />)
    expect(await screen.findByText('G1 Documento maestro')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ver observaciones' })).toBeNull()

    await userEvent.click(
      screen.getByRole('button', { name: /Acciones de la revisión de G1/i }),
    )
    expect(await screen.findByRole('menuitem', { name: 'Observaciones' })).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Historial de versiones' }),
    ).toBeInTheDocument()
  })

  it('Observaciones abre la consulta separada y el menú enlaza la pantalla de historial', async () => {
    render(<MisRevisionesPage />)
    await screen.findByText('G1 Documento maestro')

    await userEvent.click(
      screen.getByRole('button', { name: /Acciones de la revisión de G1/i }),
    )
    const historial = await screen.findByRole('menuitem', {
      name: 'Historial de versiones',
    })
    expect(historial).toHaveAttribute(
      'href',
      '/revisor/revisiones/ev-1/versiones',
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Observaciones' }))
    expect(await screen.findByText('Vista de observaciones')).toBeInTheDocument()
  })
})
