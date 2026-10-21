import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RejillaPlantillas } from '@/components/siac/rejilla-plantillas'
import type { Plantilla } from '@/lib/tipos'

vi.mock('@/lib/servicios/plantillas.servicio', () => ({
  obtenerUrlDescargaPlantillaApi: vi.fn(),
}))

const PLANTILLA = {
  id: 'pl-1',
  nombre: 'G1 Documento maestro',
  formato: 'DOCX',
  version: '2026.1',
  categoria: 'Programa',
  codigoGuia: 'G1',
  tipoTramite: 'General',
  vigente: true,
} as Plantilla

describe('RejillaPlantillas: estados de carga (HU-005)', () => {
  it('muestra «Cargando plantillas…» mientras la lista se pide y aún no hay datos', () => {
    render(<RejillaPlantillas plantillas={[]} cargando />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando plantillas…')
    expect(screen.queryByText(/No hay plantillas cargadas/)).not.toBeInTheDocument()
  })

  it('con error muestra el mensaje y «Reintentar» vuelve a pedir la lista', async () => {
    const onReintentar = vi.fn()
    render(
      <RejillaPlantillas
        plantillas={[]}
        error="No se pudieron cargar las plantillas."
        onReintentar={onReintentar}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar las plantillas.')
    expect(screen.queryByText(/No hay plantillas cargadas/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onReintentar).toHaveBeenCalledTimes(1)
  })

  it('solo dice «No hay plantillas cargadas» cuando la carga terminó sin resultados', () => {
    render(<RejillaPlantillas plantillas={[]} cargando={false} error={null} />)

    expect(screen.getByText(/No hay plantillas cargadas/)).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('si ya hay plantillas las muestra aunque se esté recargando', () => {
    render(<RejillaPlantillas plantillas={[PLANTILLA]} cargando />)

    expect(screen.getByText('G1 Documento maestro')).toBeInTheDocument()
    expect(screen.queryByText('Cargando plantillas…')).not.toBeInTheDocument()
  })
})
