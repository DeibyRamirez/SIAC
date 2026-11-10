import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const reemplazar = vi.fn()
vi.mock('@/lib/servicios/evidencias.servicio', () => ({
  reemplazarDocumentoGestionApi: (...args: unknown[]) => reemplazar(...args),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { BotonReemplazarDocumento, puedeReemplazarDocumento } from '@/components/siac/boton-reemplazar-documento'

describe('BotonReemplazarDocumento (flujo heredado)', () => {
  beforeEach(() => reemplazar.mockReset())

  it('el Revisor puede desde documento aprobado; Administrador conserva su flujo', () => {
    expect(puedeReemplazarDocumento('Revisor', 'Cumple')).toBe(true)
    expect(puedeReemplazarDocumento('Revisor', 'Validado')).toBe(true)
    expect(puedeReemplazarDocumento('Revisor', 'ConObservaciones')).toBe(false)
    expect(puedeReemplazarDocumento('Administrador', 'Validado')).toBe(true)
    expect(puedeReemplazarDocumento('Cargador', 'Validado')).toBe(false)
  })

  it('no se muestra al Cargador', () => {
    render(<BotonReemplazarDocumento evidenciaId="e1" estado="Validado" rol="Cargador" />)
    expect(screen.queryByText('Subir nueva versión')).toBeNull()
  })

  it('muestra el botón y confirma antes de llamar a la API', async () => {
    reemplazar.mockResolvedValue({ id: 'e1' })
    const alReemplazar = vi.fn()
    render(<BotonReemplazarDocumento evidenciaId="e1" estado="Cumple" rol="Revisor" onReemplazado={alReemplazar} />)
    const archivo = new File(['x'], 'nuevo.docx')
    fireEvent.change(screen.getByTestId('entrada-reemplazo-documento'), {
      target: { files: [archivo] },
    })

    expect(await screen.findByText('¿Publicar la nueva versión?')).toBeInTheDocument()
    expect(reemplazar).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Sí, publicar' }))
    await waitFor(() => expect(alReemplazar).toHaveBeenCalled())
    expect(reemplazar).toHaveBeenCalledWith('e1', archivo)
  })

  it('cancelar la confirmación no ejecuta la mutación', async () => {
    render(<BotonReemplazarDocumento evidenciaId="e1" estado="Cumple" rol="Revisor" />)
    const archivo = new File(['x'], 'nuevo.docx')
    fireEvent.change(screen.getByTestId('entrada-reemplazo-documento'), {
      target: { files: [archivo] },
    })
    await screen.findByText('¿Publicar la nueva versión?')
    await userEvent.click(screen.getByRole('button', { name: 'No, cancelar' }))
    expect(reemplazar).not.toHaveBeenCalled()
  })

  it('rechaza un archivo que no es .docx sin llamar a la API', async () => {
    render(<BotonReemplazarDocumento evidenciaId="e1" estado="Cumple" rol="Revisor" />)
    const archivo = new File(['x'], 'documento.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByTestId('entrada-reemplazo-documento'), {
      target: { files: [archivo] },
    })
    await waitFor(() => expect(reemplazar).not.toHaveBeenCalled())
  })

  it('rechaza un .docx de más de 20 MB sin llamar a la API', async () => {
    render(<BotonReemplazarDocumento evidenciaId="e1" estado="Cumple" rol="Revisor" />)
    const archivo = new File(['x'], 'grande.docx')
    Object.defineProperty(archivo, 'size', { value: 20 * 1024 * 1024 + 1 })
    fireEvent.change(screen.getByTestId('entrada-reemplazo-documento'), {
      target: { files: [archivo] },
    })
    await waitFor(() => expect(reemplazar).not.toHaveBeenCalled())
  })
})
