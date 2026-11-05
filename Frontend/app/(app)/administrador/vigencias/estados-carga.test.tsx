import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useSearchParams: () => parametrosUrl,
}))
vi.mock('@/components/layout/shell-aplicacion', () => ({
  PlantillaPaginaApp: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
// Referencia estable, como la del proveedor real (evita recargas en bucle).
const almacen = vi.hoisted(() => ({ datos: { anexosVigencia: [], alertas: [] } }))
const parametrosUrl = vi.hoisted(() => new URLSearchParams())
vi.mock('@/components/auth/proveedor-almacen', () => ({
  usarAlmacen: () => almacen,
}))
vi.mock('@/components/siac/tarjeta-umbrales-semaforo', () => ({
  TarjetaUmbralesSemaforo: () => null,
}))
vi.mock('@/components/siac/panel-paquetes-vigencia-registro', () => ({
  PanelPaquetesVigenciaRegistro: () => null,
}))
vi.mock('@/lib/servicios/cliente-api', () => ({ apiDisponible: () => true }))
vi.mock('@/lib/servicios/evidencias.servicio', () => ({ listarEvidenciasApi: vi.fn() }))
vi.mock('@/lib/servicios/vigencias.servicio', () => ({
  listarPaquetesRegistroVigenciaApi: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/servicios/programas.servicio', () => ({
  crearVigenciaConArchivoApi: vi.fn(),
  listarProgramasApi: vi.fn().mockResolvedValue([]),
  listarVigenciasApi: vi.fn(),
  obtenerUrlDescargaVigenciaApi: vi.fn(),
}))

import VigenciasPage from './page'
import { listarVigenciasApi } from '@/lib/servicios/programas.servicio'

const vigenciasMock = vi.mocked(listarVigenciasApi)

describe('Vigencias (Administrador): estados de carga', () => {
  beforeEach(() => {
    vigenciasMock.mockReset()
  })

  it('muestra «Cargando vigencias…» antes del estado vacío', async () => {
    let resolver!: (valor: unknown[]) => void
    vigenciasMock.mockReturnValue(new Promise((res) => (resolver = res)))

    render(<VigenciasPage />)

    expect(await screen.findByText('Cargando vigencias…')).toBeInTheDocument()
    expect(screen.queryByText('No hay documentos con vigencia registrados.')).not.toBeInTheDocument()

    resolver([])
    expect(
      await screen.findByText('No hay documentos con vigencia registrados.'),
    ).toBeInTheDocument()
  })

  it('con fallo muestra el error y «Reintentar» vuelve a pedir las vigencias', async () => {
    vigenciasMock.mockRejectedValueOnce(new Error('Failed to fetch'))
    vigenciasMock.mockResolvedValue([])

    render(<VigenciasPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar las vigencias: Failed to fetch',
    )
    expect(screen.queryByText('No hay documentos con vigencia registrados.')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(vigenciasMock).toHaveBeenCalledTimes(2))
    expect(
      await screen.findByText('No hay documentos con vigencia registrados.'),
    ).toBeInTheDocument()
  })
})
