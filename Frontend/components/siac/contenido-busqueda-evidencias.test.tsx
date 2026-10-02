import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const reemplazar = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: reemplazar }),
  usePathname: () => '/administrador/busqueda',
}))

vi.mock('@/lib/servicios/cliente-api', () => ({
  apiDisponible: () => false,
}))

vi.mock('@/lib/servicios/busqueda.servicio', () => ({
  buscarEvidenciasApi: vi.fn(),
}))

vi.mock('@/components/auth/proveedor-almacen', () => ({
  usarAlmacen: () => ({ datos: { programas: [] } }),
}))

import { ContenidoBusquedaEvidencias } from '@/components/siac/contenido-busqueda-evidencias'

describe('ContenidoBusquedaEvidencias', () => {
  beforeEach(() => {
    reemplazar.mockClear()
  })

  it('muestra estado vacío y limpia la URL al pulsar Limpiar filtros', async () => {
    const usuario = userEvent.setup()

    render(
      <ContenidoBusquedaEvidencias
        filtrosIniciales={{ q: 'inexistente', programa: 'derecho' }}
        datosIniciales={{ resultados: [], total: 0, pagina: 1, limite: 20 }}
      />,
    )

    expect(screen.getByText(/No se encontraron evidencias/i)).toBeInTheDocument()
    const botones = screen.getAllByRole('button', { name: /Limpiar filtros/i })
    await usuario.click(botones[0])

    expect(reemplazar).toHaveBeenCalledWith('/administrador/busqueda', { scroll: false })
  })

  it('muestra la columna Fecha y hora cuando hay resultados', () => {
    render(
      <ContenidoBusquedaEvidencias
        filtrosIniciales={{}}
        datosIniciales={{
          resultados: [
            {
              id: 'ev-1',
              nombre: 'G1 Documento Maestro',
              programaId: 'prog-1',
              programa: { id: 'prog-1', nombre: 'Derecho' },
              periodo: '2026-2',
              estado: 'Cumple',
              autorId: 'user-1',
              nombreArchivo: 'doc.pdf',
              fechaCarga: '2026-10-01T20:30:00.000Z',
              codigoGuia: 'G1',
            },
          ],
          total: 1,
          pagina: 1,
          limite: 20,
        }}
      />,
    )

    expect(screen.getByText('Fecha y hora')).toBeInTheDocument()
    expect(screen.getByText(/01 de oct de 2026/i)).toBeInTheDocument()
    expect(screen.getByText(/p\. m\./i)).toBeInTheDocument()
  })
})
