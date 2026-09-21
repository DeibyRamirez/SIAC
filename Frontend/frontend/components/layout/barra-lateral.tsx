'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  ClipboardCheck,
  FileCheck2,
  Files,
  LayoutDashboard,
  LogOut,
  Search,
  ShieldCheck,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { prefijoRol } from '@/lib/auth-mock'
import type { RolUsuario } from '@/lib/tipos'
import { cn } from '@/lib/utils'

interface ItemNavegacion {
  href: string
  etiqueta: string
  icono: typeof LayoutDashboard
}

function itemsPorRol(rol: RolUsuario): ItemNavegacion[] {
  switch (rol) {
    case 'Cargador':
      return [
        { href: '/cargador', etiqueta: 'Inicio', icono: LayoutDashboard },
        { href: '/cargador/evidencias/nueva', etiqueta: 'Cargar evidencia', icono: Files },
        { href: '/cargador/evidencias', etiqueta: 'Mis evidencias', icono: ClipboardCheck },
        { href: '/cargador/plantillas', etiqueta: 'Plantillas', icono: FileCheck2 },
      ]
    case 'Revisor':
      return [
        { href: '/revisor', etiqueta: 'Inicio', icono: LayoutDashboard },
        { href: '/revisor/bandeja', etiqueta: 'Bandeja de revisión', icono: FileCheck2 },
      ]
    case 'Administrador':
    case 'ParAcademico':
      return [
        { href: '/administrador', etiqueta: 'Inicio', icono: LayoutDashboard },
        { href: '/administrador/programas', etiqueta: 'Programas', icono: ClipboardCheck },
        { href: '/administrador/busqueda', etiqueta: 'Búsqueda', icono: Search },
        { href: '/administrador/vigencias', etiqueta: 'Vigencias', icono: Bell },
        { href: '/administrador/dashboard', etiqueta: 'Dashboard Power BI', icono: ShieldCheck },
      ]
  }
}

export function BarraLateral() {
  const pathname = usePathname()
  const { sesion, cerrarSesion, etiquetaRolActual } = usarSesion()

  if (!sesion) {
    return null
  }

  const items = itemsPorRol(sesion.rol)
  const iniciales = sesion.nombre
    .split(' ')
    .map((parte) => parte[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-white px-4 py-6">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-[#102f55] text-white">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-[0.12em] text-[#102f55]">SIAC</p>
          <p className="text-[10px] text-muted-foreground">Calidad académica CUAC</p>
        </div>
      </div>

      <nav className="space-y-1">
        <p className="px-3 pb-2 text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
          Navegación
        </p>
        {items.map(({ href, etiqueta, icono: Icono }) => {
          const activo = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                activo
                  ? 'bg-[#eaf2f7] font-semibold text-[#102f55]'
                  : 'text-muted-foreground hover:bg-muted hover:text-[#102f55]',
              )}
            >
              <Icono className="size-4" />
              {etiqueta}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto space-y-4 border-t border-border pt-4">
        <div className="flex items-center gap-3 px-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-[#d9e8e7] text-xs font-bold text-[#247c79]">
            {iniciales}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#102f55]">{sesion.nombre}</p>
            <p className="truncate text-xs text-muted-foreground">{etiquetaRolActual}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={cerrarSesion}>
          <LogOut className="size-4" />
          Cerrar sesión
        </Button>
        <p className="text-center text-[10px] text-muted-foreground">
          Prototipo · {prefijoRol(sesion.rol)}
        </p>
      </div>
    </aside>
  )
}
