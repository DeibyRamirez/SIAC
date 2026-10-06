import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cargarResolucion = vi.fn()
vi.mock('@/lib/servicios/resolucion-men.servicio', () => ({
  cargarResolucionMenApi: (...args: unknown[]) => cargarResolucion(...args),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import {
  TarjetaCargarResolucion,
  motivoRechazoArchivoResolucion,
} from '@/components/siac/tarjeta-cargar-resolucion'

const pdf = () => new File(['%PDF-1.7'], 'Resolucion 012345.pdf', { type: 'application/pdf' })

describe('TarjetaCargarResolucion (resolución MEN)', () => {
  beforeEach(() => cargarResolucion.mockReset())

  it('con documentos pendientes el botón queda deshabilitado y se listan los pendientes', () => {
    render(<TarjetaCargarResolucion programaId="p1" puedeCargar={false} documentosPendientes={['G2']} onCargada={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Cargar resolución' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Pendientes: G2')
  })

  it('con todo aprobado envía número, fecha real y PDF del programa', async () => {
    const usuario = userEvent.setup()
    const onCargada = vi.fn()
    cargarResolucion.mockResolvedValue({ numero: '012345', fechaFinVigencia: '2027-03-01T00:00:00.000Z' })
    render(<TarjetaCargarResolucion programaId="p1" puedeCargar documentosPendientes={[]} onCargada={onCargada} />)

    await usuario.type(screen.getByLabelText('Número de resolución'), '012345')
    await usuario.type(screen.getByLabelText('Fecha de la resolución'), '2020-03-01')
    await usuario.upload(screen.getByLabelText('PDF de la resolución'), pdf())
    await usuario.click(screen.getByRole('button', { name: 'Cargar resolución' }))

    expect(cargarResolucion).toHaveBeenCalledWith(
      { programaId: 'p1' },
      expect.objectContaining({ numero: '012345', fechaResolucion: '2020-03-01' }),
    )
    expect(onCargada).toHaveBeenCalled()
  })

  it('el selector solo acepta PDF y la validación previa rechaza .docx', () => {
    render(<TarjetaCargarResolucion puedeCargar documentosPendientes={[]} onCargada={vi.fn()} />)
    expect(screen.getByLabelText('PDF de la resolución')).toHaveAttribute('accept', '.pdf,application/pdf')
    expect(motivoRechazoArchivoResolucion(new File(['x'], 'resolucion.docx'))).toMatch(/\.pdf/)
    expect(motivoRechazoArchivoResolucion(pdf())).toBeNull()
  })
})
