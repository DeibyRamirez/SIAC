import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProveedorAlmacen } from '@/components/auth/proveedor-almacen'
import { CampanaNotificaciones } from '@/components/layout/campana-notificaciones'

const routerMock = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerMock.push }),
}))

const estadoSesion = vi.hoisted(() => ({ rol: 'Administrador' as string }))
vi.mock('@/components/auth/proveedor-sesion', () => ({
  usarSesion: () => ({ sesion: { usuarioId: 'u-admin', rol: estadoSesion.rol } }),
}))

vi.mock('@/lib/servicios/programas.servicio', () => ({
  listarProgramasApi: vi.fn().mockResolvedValue([]),
  listarVigenciasApi: vi.fn().mockResolvedValue([]),
  listarNotificacionesApi: vi.fn(),
  marcarNotificacionLeidaApi: vi.fn(),
  marcarTodasNotificacionesLeidasApi: vi.fn(),
}))

vi.mock('@/lib/servicios/evidencias.servicio', () => ({
  listarEvidenciasApi: vi
    .fn()
    .mockResolvedValue({ datos: [], total: 0, pagina: 1, limite: 100 }),
}))

vi.mock('@/lib/servicios/plantillas.servicio', () => ({
  listarPlantillasApi: vi.fn().mockResolvedValue([]),
}))

import {
  listarNotificacionesApi,
  marcarNotificacionLeidaApi,
} from '@/lib/servicios/programas.servicio'

const listarMock = vi.mocked(listarNotificacionesApi)
const marcarMock = vi.mocked(marcarNotificacionLeidaApi)

const ALERTAS = [
  {
    id: 'a-1',
    mensaje: 'El programa "Derecho" alcanzó el umbral amarillo de vigencia.',
    leida: false,
    createdAt: '2026-10-16T10:00:00.000Z',
    tipo: 'vigencia_amarilla',
    metadata: { programaId: 'p-1' },
  },
  {
    id: 'a-2',
    mensaje: 'El certificado de bomberos vence mañana.',
    leida: false,
    createdAt: '2026-10-16T09:00:00.000Z',
    tipo: 'anexo_vence_manana',
    metadata: { anexoId: 'anx-1' },
  },
  {
    id: 'a-3',
    mensaje: 'Alerta ya leída que no debe salir.',
    leida: true,
    createdAt: '2026-10-15T09:00:00.000Z',
    tipo: 'general',
    metadata: null,
  },
]

function renderCampana() {
  return render(
    <ProveedorAlmacen>
      <CampanaNotificaciones />
    </ProveedorAlmacen>,
  )
}

async function abrirCampana() {
  const disparador = await screen.findByRole('button', { name: '2 alertas pendientes' })
  await userEvent.click(disparador)
  return disparador
}

describe('CampanaNotificaciones (§6.7)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    estadoSesion.rol = 'Administrador'
    listarMock.mockResolvedValue(ALERTAS)
    marcarMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra el contador de no leídas y lista solo las alertas pendientes', async () => {
    renderCampana()

    await abrirCampana()
    expect(
      await screen.findByText('El programa "Derecho" alcanzó el umbral amarillo de vigencia.'),
    ).toBeInTheDocument()
    expect(screen.getByText('El certificado de bomberos vence mañana.')).toBeInTheDocument()
    expect(screen.queryByText('Alerta ya leída que no debe salir.')).not.toBeInTheDocument()
    expect(screen.getAllByText('Vigencia')).toHaveLength(2)
    expect(screen.getAllByText('Ver vigencias')).toHaveLength(2)
  })

  it('marcar como leída llama a la API, navega y baja el contador', async () => {
    renderCampana()
    await abrirCampana()

    await userEvent.click(
      await screen.findByText('El programa "Derecho" alcanzó el umbral amarillo de vigencia.'),
    )

    await waitFor(() => {
      expect(marcarMock).toHaveBeenCalledWith('a-1')
    })
    expect(routerMock.push).toHaveBeenCalledWith('/administrador/vigencias?programaId=p-1')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '1 alerta pendiente' })).toBeInTheDocument()
    })
    expect(
      screen.queryByText('El programa "Derecho" alcanzó el umbral amarillo de vigencia.'),
    ).not.toBeInTheDocument()
  })

  it('con la demo de vigencia en curso refresca cada 5 s (fake timers)', async () => {
    vi.useFakeTimers()
    sessionStorage.setItem('siac-demo-vigencia:Programa:p-1', '123')
    renderCampana()

    await act(async () => {
      await Promise.resolve()
    })
    const llamadasIniciales = listarMock.mock.calls.length

    await act(async () => {
      vi.advanceTimersByTime(5_000)
    })
    expect(listarMock.mock.calls.length).toBeGreaterThan(llamadasIniciales)

    const trasUnTick = listarMock.mock.calls.length
    await act(async () => {
      vi.advanceTimersByTime(5_000)
    })
    expect(listarMock.mock.calls.length).toBeGreaterThan(trasUnTick)
  })

  it('sin demo activa no programa refrescos adicionales a los 5 s', async () => {
    vi.useFakeTimers()
    renderCampana()

    await act(async () => {
      await Promise.resolve()
    })
    const llamadasIniciales = listarMock.mock.calls.length

    await act(async () => {
      vi.advanceTimersByTime(5_000)
    })
    expect(listarMock.mock.calls.length).toBe(llamadasIniciales)
  })

  it('sin alertas pendientes muestra el estado vacío', async () => {
    listarMock.mockResolvedValue([{ ...ALERTAS[2] }])
    renderCampana()

    await userEvent.click(await screen.findByRole('button', { name: 'Sin alertas pendientes' }))
    expect(await screen.findByText('No hay alertas pendientes')).toBeInTheDocument()
  })

  it('abre el panel completo con encabezado, contador y lista con scroll interno', async () => {
    const muchas = Array.from({ length: 12 }, (_, indice) => ({
      ...ALERTAS[0],
      id: `a-muchas-${indice}`,
      mensaje: `Alerta número ${indice + 1} de la bandeja.`,
    }))
    listarMock.mockResolvedValue(muchas)
    renderCampana()

    const disparador = await screen.findByRole('button', { name: '12 alertas pendientes' })
    expect(disparador).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(disparador)

    await waitFor(() => {
      expect(disparador).toHaveAttribute('aria-expanded', 'true')
    })
    expect(await screen.findByText('Notificaciones')).toBeVisible()
    expect(screen.getByText('12 pendientes')).toBeInTheDocument()
    const lista = screen.getByTestId('lista-notificaciones')
    expect(lista).toHaveClass('overflow-y-auto')
    expect(within(lista).getAllByText(/Alerta número/)).toHaveLength(12)
  })

  it('cierra con Escape y con clic fuera de la campana', async () => {
    renderCampana()
    const disparador = await abrirCampana()
    expect(await screen.findByText('Notificaciones')).toBeVisible()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByText('Notificaciones')).not.toBeInTheDocument()
    })
    expect(disparador).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(disparador)
    expect(await screen.findByText('Notificaciones')).toBeVisible()
    await userEvent.click(document.body)
    await waitFor(() => {
      expect(screen.queryByText('Notificaciones')).not.toBeInTheDocument()
    })
  })

  it.each(['SuperAdmin', 'Administrador', 'Revisor', 'Cargador'])(
    'el panel se abre igual para el rol %s',
    async (rol) => {
      estadoSesion.rol = rol
      renderCampana()
      await abrirCampana()
      expect(await screen.findByText('Notificaciones')).toBeVisible()
      expect(screen.getByTestId('lista-notificaciones')).toBeInTheDocument()
    },
  )

  it('un error de red deja la campana vacía sin romper el layout', async () => {
    listarMock.mockRejectedValue(new Error('sin conexión'))
    renderCampana()

    const disparador = await screen.findByRole('button', { name: 'Sin alertas pendientes' })
    await userEvent.click(disparador)
    expect(await screen.findByText('No hay alertas pendientes')).toBeInTheDocument()
    expect(disparador).toBeInTheDocument()
  })
})
