'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { AlertaInApp } from '@/lib/tipos'
import {
  contadorBadgeNotificaciones,
  resolverAccionNotificacion,
  textoBadgeNotificaciones,
} from '@/lib/utilidades/accion-notificacion'
import { etiquetaTipoNotificacion } from '@/lib/utilidades/etiqueta-notificacion'
import { hayDemoVigenciaEnCurso } from '@/lib/utilidades/vigencia-registro'

export function CampanaNotificaciones() {
  const router = useRouter()
  const { sesion } = usarSesion()
  const { datos, marcarAlertaLeida, marcarTodasAlertasLeidas, recargarAlertas } = usarAlmacen()

  // §0: en modo prueba (demo acelerada), la campana refresca cada 5 s para seguir el semáforo.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (hayDemoVigenciaEnCurso()) void recargarAlertas()
    }, 5_000)
    return () => window.clearInterval(id)
  }, [recargarAlertas])

  const alertasPendientes = datos.alertas.filter((alerta) => !alerta.leida)
  const contador = contadorBadgeNotificaciones(alertasPendientes.length)
  const rol = sesion?.rol

  const manejarCambioAbierto = (open: boolean) => {
    if (open) {
      void recargarAlertas()
    }
  }

  const manejarSeleccion = (alerta: AlertaInApp) => {
    const accion = rol ? resolverAccionNotificacion(alerta.tipo, alerta.metadata, rol) : null
    if (accion) {
      router.push(accion.href)
    }
    marcarAlertaLeida(alerta.id)
  }

  return (
    <DropdownMenu onOpenChange={manejarCambioAbierto}>
      <DropdownMenuTrigger
        type="button"
        aria-label={textoBadgeNotificaciones(alertasPendientes.length)}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'icon' }),
          'relative shrink-0 border-primary/20',
        )}
      >
        <Bell className="size-4 text-primary" aria-hidden />
        {contador ? (
          <span
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold leading-none text-white"
            aria-hidden
          >
            {contador}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={20}
        collisionPadding={8}
        className="z-[300] w-[min(360px,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] overflow-hidden p-0"
      >
        <DropdownMenuGroup>
          <div className="border-b border-primary/10 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-primary">Notificaciones</span>
              <Badge variant={alertasPendientes.length > 0 ? 'destructive' : 'secondary'}>
                {alertasPendientes.length}{' '}
                {alertasPendientes.length === 1 ? 'pendiente' : 'pendientes'}
              </Badge>
            </div>
            {alertasPendientes.length > 0 ? (
              <DropdownMenuItem
                className="mt-2 cursor-pointer text-xs text-esmeralda"
                onClick={() => marcarTodasAlertasLeidas()}
              >
                Marcar todas como leídas
              </DropdownMenuItem>
            ) : null}
          </div>
          <DropdownMenuSeparator className="mx-0" />
          <div
            data-testid="lista-notificaciones"
            className="max-h-[min(480px,calc(100dvh-10rem))] overflow-y-auto p-1"
          >
            {alertasPendientes.length === 0 ? (
              <DropdownMenuItem disabled>No hay alertas pendientes</DropdownMenuItem>
            ) : (
              alertasPendientes.map((alerta) => {
                const accion = rol
                  ? resolverAccionNotificacion(alerta.tipo, alerta.metadata, rol)
                  : null
                return (
                  <DropdownMenuItem
                    key={alerta.id}
                    onClick={() => manejarSeleccion(alerta)}
                    className="flex cursor-pointer flex-col items-start gap-1 py-2"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-esmeralda">
                      {etiquetaTipoNotificacion(alerta.tipo)}
                    </span>
                    <span className="text-sm text-pretty">{alerta.mensaje}</span>
                    {accion ? (
                      <span className="text-xs font-medium text-ring">{accion.etiqueta}</span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">{alerta.fecha}</span>
                  </DropdownMenuItem>
                )
              })
            )}
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
