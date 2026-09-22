'use client'

import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  Files,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { prefijoRol } from '@/lib/auth-mock'
import type { RolUsuario } from '@/lib/tipos'
import { contarEvidenciasPendientes, contarNovedadesCargador } from '@/lib/utilidades-siac'
import { cn } from '@/lib/utils'

interface ItemNavegacion {
  href: string
  etiqueta: string
  icono: LucideIcon
  mostrarBadge?: boolean
  mostrarBadgeNovedades?: boolean
}

function itemsCargador(): ItemNavegacion[] {
  return [
    { href: '/cargador', etiqueta: 'Resumen general', icono: LayoutDashboard },
    { href: '/cargador/evidencias/nueva', etiqueta: 'Cargar evidencia', icono: Files },
    {
      href: '/cargador/evidencias',
      etiqueta: 'Mis evidencias',
      icono: ClipboardCheck,
      mostrarBadgeNovedades: true,
    },
    { href: '/cargador/plantillas', etiqueta: 'Biblioteca de plantillas', icono: FileCheck2 },
  ]
}

function itemsRevisor(): ItemNavegacion[] {
  return [
    { href: '/revisor', etiqueta: 'Resumen general', icono: LayoutDashboard },
    { href: '/revisor/bandeja', etiqueta: 'Bandeja de revisión', icono: FileCheck2, mostrarBadge: true },
  ]
}

function itemsAdministrador(): ItemNavegacion[] {
  return [
    { href: '/administrador', etiqueta: 'Resumen general', icono: LayoutDashboard },
    { href: '/administrador/dashboard', etiqueta: 'Dashboard de métricas', icono: ShieldCheck },
    { href: '/administrador/programas', etiqueta: 'Programas académicos', icono: BookOpen },
    { href: '/administrador/evidencias', etiqueta: 'Evidencias y documentos', icono: Files },
    { href: '/administrador/vigencias', etiqueta: 'Vigencias y alertas', icono: Bell },
    { href: '/administrador/plantillas', etiqueta: 'Biblioteca de plantillas', icono: FileCheck2 },
    {
      href: '/administrador/bandeja-revision',
      etiqueta: 'Bandeja de revisión',
      icono: ClipboardCheck,
      mostrarBadge: true,
    },
  ]
}

function itemsParAcademico(): ItemNavegacion[] {
  return [
    { href: '/administrador', etiqueta: 'Resumen general', icono: LayoutDashboard },
    { href: '/administrador/dashboard', etiqueta: 'Dashboard de métricas', icono: ShieldCheck },
    { href: '/administrador/programas', etiqueta: 'Programas académicos', icono: BookOpen },
    { href: '/administrador/evidencias', etiqueta: 'Evidencias validadas', icono: Files },
  ]
}

function itemsSuperAdmin(): ItemNavegacion[] {
  return [
    { href: '/superadmin', etiqueta: 'Panel SuperAdmin', icono: ShieldCheck },
    { href: '/superadmin/usuarios', etiqueta: 'Gestión de usuarios', icono: Users },
    { href: '/cargador', etiqueta: 'Módulo cargador', icono: Files },
    { href: '/revisor/bandeja', etiqueta: 'Bandeja revisor', icono: FileCheck2, mostrarBadge: true },
    { href: '/administrador', etiqueta: 'Módulo administrador', icono: LayoutDashboard },
  ]
}

function itemsPorRol(rol: RolUsuario): ItemNavegacion[] {
  switch (rol) {
    case 'Cargador':
      return itemsCargador()
    case 'Revisor':
      return itemsRevisor()
    case 'Administrador':
      return itemsAdministrador()
    case 'ParAcademico':
      return itemsParAcademico()
    case 'SuperAdmin':
      return itemsSuperAdmin()
    default:
      return []
  }
}

export function BarraLateral({
  className,
  alNavegar,
  plegado = false,
  onAlternarPlegado,
}: {
  className?: string
  alNavegar?: () => void
  plegado?: boolean
  onAlternarPlegado?: () => void
}) {
  const pathname = usePathname()
  const { sesion, cerrarSesion, etiquetaRolActual } = usarSesion()
  const { datos } = usarAlmacen()

  if (!sesion) {
    return null
  }

  const items = itemsPorRol(sesion.rol)
  const pendientes = contarEvidenciasPendientes(datos.evidencias)
  const novedadesCargador = sesion
    ? contarNovedadesCargador(datos.evidencias, sesion.usuarioId)
    : 0
  const iniciales = sesion.nombre
    .split(' ')
    .map((parte) => parte[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside
      className={cn(
        'panel-sidebar flex shrink-0 flex-col border-r border-primary/20 shadow-lg transition-[width] duration-200',
        plegado ? 'w-16' : 'w-64',
        className,
      )}
    >
      <div className="px-3 pt-5 pb-4 text-primary-foreground">
        <div className={cn('mb-4 flex items-center', plegado ? 'justify-center' : 'gap-3')}>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <ShieldCheck className="size-5 text-white" />
          </div>
          {!plegado && (
            <div>
              <p className="text-sm font-extrabold tracking-[0.12em] text-white uppercase">SIAC</p>
              <p className="text-[10px] text-white/75">Calidad académica CUAC</p>
            </div>
          )}
        </div>
        {onAlternarPlegado && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              'text-white hover:bg-white/10',
              plegado ? 'mx-auto' : 'ml-auto flex',
            )}
            onClick={onAlternarPlegado}
            aria-label={plegado ? 'Expandir menú' : 'Contraer menú'}
          >
            {plegado ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        )}
      </div>

      {!plegado && (
        <div className="mx-3 -mt-1 mb-3 rounded-xl border border-primary/10 bg-white px-3 py-2.5 shadow-sm">
          <p className="etiqueta-seccion text-[10px]">Institución</p>
          <p className="mt-1 text-xs leading-snug font-semibold text-primary">
            Corporación Universitaria Autónoma del Cauca
          </p>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden bg-white px-2 py-3">
        {!plegado && (
          <p className="etiqueta-seccion px-3 pb-2 text-[10px]">Gestión de calidad</p>
        )}
        {items.map(({ href, etiqueta, icono: Icono, mostrarBadge, mostrarBadgeNovedades }) => {
          const contadorBadge = mostrarBadgeNovedades ? novedadesCargador : pendientes
          const mostrarContador = mostrarBadge || mostrarBadgeNovedades
          const activo =
            pathname === href ||
            (href !== prefijoRol(sesion.rol) && pathname.startsWith(`${href}/`))
          return (
            <Link
              key={href}
              href={href}
              onClick={alNavegar}
              title={plegado ? etiqueta : undefined}
              className={cn(
                'relative flex items-center rounded-lg py-2.5 text-sm transition-all',
                plegado ? 'justify-center px-2' : 'gap-3 px-3',
                activo
                  ? 'border-l-[3px] border-esmeralda bg-accent font-bold text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-primary',
              )}
            >
              <Icono className={cn('size-4 shrink-0', activo && 'text-esmeralda')} />
              {!plegado && <span className="flex-1 truncate">{etiqueta}</span>}
              {mostrarContador && contadorBadge > 0 && (
                plegado ? (
                  <span
                    className={cn(
                      'absolute top-1.5 right-1.5 size-2 rounded-full',
                      mostrarBadgeNovedades ? 'bg-fucsia' : 'bg-coral',
                    )}
                  />
                ) : (
                  <Badge
                    variant={mostrarBadgeNovedades ? 'destructive' : 'coral'}
                    className="size-5 justify-center rounded-full p-0 text-[10px]"
                  >
                    {contadorBadge}
                  </Badge>
                )
              )}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-2 border-t border-primary/10 bg-white px-2 py-4">
        {!plegado && (
          <>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-primary"
            >
              <HelpCircle className="size-4" />
              Centro de ayuda
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-primary"
            >
              <Settings className="size-4" />
              Configuración
            </button>
          </>
        )}
        <div
          className={cn(
            'flex items-center rounded-xl bg-accent/60 py-2',
            plegado ? 'justify-center px-1' : 'gap-3 px-2',
          )}
          title={plegado ? `${sesion.nombre} · ${etiquetaRolActual}` : undefined}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {iniciales}
          </span>
          {!plegado && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-primary">{sesion.nombre}</p>
              <p className="truncate text-xs text-esmeralda">{etiquetaRolActual}</p>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size={plegado ? 'icon-sm' : 'default'}
          className={cn('border-primary/20 text-primary', plegado ? 'mx-auto' : 'w-full')}
          onClick={cerrarSesion}
          title={plegado ? 'Cerrar sesión' : undefined}
        >
          <LogOut className="size-4" />
          {!plegado && 'Cerrar sesión'}
        </Button>
        {!plegado && (
          <p className="text-center text-[10px] text-muted-foreground">SIAC v1.0 · CUAC</p>
        )}
      </div>
    </aside>
  )
}
