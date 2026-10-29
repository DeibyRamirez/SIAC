import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GuardiaSesion } from '@/components/auth/guardia-sesion'
import { prefijoRol } from '@/lib/auth-mock'
import { ROLES_DASHBOARD_METRICAS } from '@/lib/constantes/roles'
import { puedeVerInformesPowerBi, ROLES_INFORMES_POWERBI } from '@/lib/powerbi/acceso-powerbi'
import type { RolUsuario } from '@/lib/tipos'

const replaceMock = vi.fn()
let rolSesion: RolUsuario = 'Revisor'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/administrador/dashboard',
}))

vi.mock('@/components/auth/proveedor-sesion', () => ({
  usarSesion: () => ({ sesion: { rol: rolSesion }, cargando: false }),
}))

vi.mock('@/components/siac/esqueletos-paginas', () => ({
  EsqueletoPaginaApp: () => <div>Cargando SIAC</div>,
}))

function renderizarDashboard() {
  return render(
    <GuardiaSesion rolesPermitidos={ROLES_DASHBOARD_METRICAS}>
      <div>Contenido del dashboard</div>
    </GuardiaSesion>,
  )
}

describe('Revisor sin acceso a los dashboards (decisión del PO, 13/10)', () => {
  beforeEach(() => {
    replaceMock.mockClear()
  })

  it('los roles del dashboard y de Power BI no incluyen al Revisor', () => {
    expect(ROLES_DASHBOARD_METRICAS).not.toContain('Revisor')
    expect(ROLES_INFORMES_POWERBI).not.toContain('Revisor')
    expect(puedeVerInformesPowerBi('Revisor')).toBe(false)
  })

  it('la guardia no muestra /administrador/dashboard al Revisor y lo devuelve a su inicio', () => {
    rolSesion = 'Revisor'
    renderizarDashboard()
    expect(screen.queryByText('Contenido del dashboard')).not.toBeInTheDocument()
    expect(replaceMock).toHaveBeenCalledWith(prefijoRol('Revisor'))
  })

  it('el Administrador sí entra al dashboard', () => {
    rolSesion = 'Administrador'
    renderizarDashboard()
    expect(screen.getByText('Contenido del dashboard')).toBeInTheDocument()
    expect(replaceMock).not.toHaveBeenCalled()
  })
})