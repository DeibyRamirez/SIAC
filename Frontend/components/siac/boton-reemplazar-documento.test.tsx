import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const reemplazar = vi.fn()
vi.mock('@/lib/servicios/evidencias.servicio', () => ({
  reemplazarDocumentoGestionApi: (...args: unknown[]) => reemplazar(...args),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { BotonReemplazarDocumento, puedeReemplazarDocumento } from '@/components/siac/boton-reemplazar-documento'

describe('BotonReemplazarDocumento', () => {
  beforeEach(() => reemplazar.mockReset())

  it('solo Revisor/Administrador/SuperAdmin y nunca en Borrador', () => {
    expect(puedeReemplazarDocumento('Revisor', 'Validado')).toBe(true)
    expect(puedeReemplazarDocumento('Administrador', 'Cumple')).toBe(true)
    expect(puedeReemplazarDocumento('Cargador', 'Validado')).toBe(false)
    expect(puedeReemplazarDocumento('Revisor', 'Borrador')).toBe(false)
  })

  it('no se muestra al Cargador', () => {
    render(<BotonReemplazarDocumento evidenciaId="e1" estado="Validado" rol="Cargador" />)
    expect(screen.queryByText('Reemplazar documento')).toBeNull()
  })

  it('pide confirmación si está validado y sube el archivo', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    reemplazar.mockResolvedValue({ id: 'e1' })
    const alReemplazar = vi.fn()
    render(<BotonReemplazarDocumento evidenciaId="e1" estado="Validado" rol="Revisor" onReemplazado={alReemplazar} />)
    const archivo = new File(['x'], 'nuevo.docx')
    fireEvent.change(screen.getByTestId('entrada-reemplazo-documento'), { target: { files: [archivo] } })
    await waitFor(() => expect(alReemplazar).toHaveBeenCalled())
    expect(window.confirm).toHaveBeenCalled()
    expect(reemplazar).toHaveBeenCalledWith('e1', archivo)
  })
})
