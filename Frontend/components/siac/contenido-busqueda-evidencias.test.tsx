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

    expect(reemplazar).toHaveBeenLastCalledWith('/administrador/busqueda', { scroll: false })
  })

  it('Limpiar no vuelve a escribir ?periodo= en la URL (R-008.3a)', async () => {
    const usuario = userEvent.setup()

    render(
      <ContenidoBusquedaEvidencias
        filtrosIniciales={{ periodo: '2026-2', estado: 'Cumple' }}
        datosIniciales={{ resultados: [], total: 0, pagina: 1, limite: 20 }}
      />,
    )
    expect(reemplazar).toHaveBeenLastCalledWith(
      '/administrador/busqueda?periodo=2026-2&estado=Cumple',
      { scroll: false },
    )

    await usuario.click(screen.getAllByRole('button', { name: /Limpiar filtros/i })[0])

    const ultimaUrl = reemplazar.mock.calls.at(-1)?.[0] as string
    expect(ultimaUrl).toBe('/administrador/busqueda')
    expect(ultimaUrl).not.toContain('periodo=')
  })

  it('sin periodo en la URL no inyecta el periodo actual (R-008.2b)', () => {
    render(
      <ContenidoBusquedaEvidencias
        filtrosIniciales={{ programa: 'derecho' }}
        datosIniciales={{ resultados: [], total: 0, pagina: 1, limite: 20 }}
      />,
    )

    expect(reemplazar).toHaveBeenLastCalledWith('/administrador/busqueda?programa=derecho', {
      scroll: false,
    })
  })

  it('muestra Limpiar cuando el único filtro activo es el periodo', () => {
    render(
      <ContenidoBusquedaEvidencias
        filtrosIniciales={{ periodo: '2025-1' }}
        datosIniciales={{ resultados: [], total: 0, pagina: 1, limite: 20 }}
      />,
    )

    expect(screen.getAllByRole('button', { name: /Limpiar filtros/i }).length).toBeGreaterThan(0)
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
