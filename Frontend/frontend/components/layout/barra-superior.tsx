'use client'

import { Bell } from 'lucide-react'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { usarSesion } from '@/components/auth/proveedor-sesion'

export function BarraSuperior({ titulo }: { titulo: string }) {
  const { sesion } = usarSesion()
  const { datos } = usarAlmacen()
  const alertasPendientes = datos.alertas.filter((alerta) => !alerta.leida).length

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6">
      <div className="text-sm text-muted-foreground">
        SIAC <span className="mx-2 text-border">/</span>
        <span className="font-semibold text-[#102f55]">{titulo}</span>
      </div>
      <div className="flex items-center gap-4">
        {sesion?.rol === 'Administrador' && (
          <div className="relative rounded-lg border border-border px-3 py-2 text-muted-foreground">
            <Bell className="size-4" />
            {alertasPendientes > 0 && (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {alertasPendientes}
              </span>
            )}
          </div>
        )}
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-[#102f55]">{sesion?.nombre}</p>
          <p className="text-xs text-muted-foreground">{sesion?.correo}</p>
        </div>
      </div>
    </header>
  )
}
