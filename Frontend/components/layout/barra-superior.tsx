'use client'

import { useEffect, useRef } from 'react'
import { Menu } from 'lucide-react'

import { usarSesion } from '@/components/auth/proveedor-sesion'
import { BusquedaInline } from '@/components/layout/busqueda-global'
import { CampanaNotificaciones } from '@/components/layout/campana-notificaciones'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

export function BarraSuperior({
  titulo,
  onAbrirMenu,
}: {
  titulo: string
  onAbrirMenu?: () => void
}) {
  const { sesion, etiquetaRolActual } = usarSesion()
  const inputBusquedaRef = useRef<HTMLInputElement>(null)

  const iniciales = sesion?.nombre
    .split(' ')
    .map((parte) => parte[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    const manejarAtajo = (evento: KeyboardEvent) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault()
        inputBusquedaRef.current?.focus()
      }
      if (evento.key === 'Escape') {
        inputBusquedaRef.current?.blur()
      }
    }
    window.addEventListener('keydown', manejarAtajo)
    return () => window.removeEventListener('keydown', manejarAtajo)
  }, [])

  return (
    <header className="panel-topbar flex h-[4.5rem] items-center gap-4 px-4 md:px-6">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 border-primary/20 md:hidden"
        onClick={onAbrirMenu}
        aria-label="Abrir menú de navegación"
      >
        <Menu className="size-4 text-primary" />
      </Button>
      <div className="hidden min-w-[180px] text-sm md:block">
        <span className="font-semibold text-esmeralda">SIAC</span>
        <span className="mx-2 text-primary/30">/</span>
        <span className="font-bold text-primary">{titulo}</span>
      </div>

      <BusquedaInline inputRef={inputBusquedaRef} />

      <div className="flex min-w-[180px] items-center justify-end gap-3">
        <CampanaNotificaciones />

        <div className="hidden items-center gap-3 sm:flex">
          <div className="text-right">
            <p className="text-sm font-bold text-primary">{sesion?.nombre}</p>
            <p className="text-xs font-medium text-esmeralda">{etiquetaRolActual}</p>
          </div>
          <Avatar className="size-9 ring-2 ring-esmeralda/30">
            <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
              {iniciales}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
