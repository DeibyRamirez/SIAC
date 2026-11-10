import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listarVersiones = vi.fn()
const obtenerBlob = vi.fn()

vi.mock('@/lib/servicios/evidencias.servicio', () => ({
  listarVersionesApi: (...args: unknown[]) => listarVersiones(...args),
}))
vi.mock('@/lib/servicios/descarga-binaria', () => ({
  obtenerBlobDocxEvidenciaApi: (...args: unknown[]) => obtenerBlob(...args),
}))

import { HistorialVersionesEvidencia } from '@/components/siac/historial-versiones-evidencia'

const VERSIONES = [
  {
    id: 'v-2',
    evidenciaId: 'ev-1',
    numero: 2,
    nombreArchivo: 'documento.docx',
    rutaArchivo: 'v2.docx',
    subidoPorId: 'rev-1',
    subidoPorRol: 'Revisor',
    subidoPor: { id: 'rev-1', nombre: 'Laura Ramírez' },
    createdAt: '2026-11-08T10:00:00.000Z',
  },
  {
    id: 'v-1',
    evidenciaId: 'ev-1',
    numero: 1,
    nombreArchivo: 'documento.docx',
    rutaArchivo: 'v1.docx',
    subidoPorId: 'car-1',
    subidoPorRol: 'Cargador',
    subidoPor: { id: 'car-1', nombre: 'María Cortés' },
    createdAt: '2026-11-07T10:00:00.000Z',
  },
]

describe('HistorialVersionesEvidencia', () => {
  beforeEach(() => {
    listarVersiones.mockReset()
    obtenerBlob.mockReset()
    listarVersiones.mockResolvedValue(VERSIONES)
    obtenerBlob.mockResolvedValue(new Blob(['docx']))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  it('lista v1..vN con fecha, autor, rol y la etiqueta de versión del revisor', async () => {
    render(<HistorialVersionesEvidencia evidenciaId="ev-1" versionActiva={2} />)

    expect(await screen.findByText('v2')).toBeInTheDocument()
    expect(screen.getByText('v1')).toBeInTheDocument()
    expect(screen.getByText('Subida por revisor')).toBeInTheDocument()
    expect(screen.getByText(/Laura Ramírez · Revisora de calidad/)).toBeInTheDocument()
    expect(screen.getByText(/María Cortés · Profesor/)).toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()
  })

  it('descarga la versión elegida y deja que el backend firme esa descarga', async () => {
    const usuario = userEvent.setup()
    render(<HistorialVersionesEvidencia evidenciaId="ev-1" versionActiva={2} />)
    await screen.findByText('v2')

    const botones = screen.getAllByRole('button', { name: /Descargar/i })
    await usuario.click(botones[0])

    await waitFor(() => expect(obtenerBlob).toHaveBeenCalledWith('ev-1', 2))
  })
})
