'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, Menu } from 'lucide-react'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { BusquedaInline } from '@/components/layout/busqueda-global'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function BarraSuperior({
  titulo,
  onAbrirMenu,
}: {
  titulo: string
  onAbrirMenu?: () => void
}) {
  const { sesion, etiquetaRolActual } = usarSesion()
  const { datos, marcarAlertaLeida } = usarAlmacen()
  const inputBusquedaRef = useRef<HTMLInputElement>(null)

  const alertasPendientes = datos.alertas.filter((alerta) => !alerta.leida)
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
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="icon" className="relative shrink-0 border-primary/20">
                <Bell className="size-4 text-primary" />
                {alertasPendientes.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-coral text-[10px] font-bold text-white">
                    {alertasPendientes.length}
                  </span>
                )}
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="text-primary">Alertas del sistema</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {alertasPendientes.length === 0 ? (
              <DropdownMenuItem disabled>No hay alertas pendientes</DropdownMenuItem>
            ) : (
              alertasPendientes.map((alerta) => (
                <DropdownMenuItem
                  key={alerta.id}
                  onClick={() => marcarAlertaLeida(alerta.id)}
                  className="flex flex-col items-start gap-1 py-2"
                >
                  <span className="text-sm">{alerta.mensaje}</span>
                  <span className="text-xs text-muted-foreground">{alerta.fecha}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

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
