'use client'

import { ShieldCheck } from 'lucide-react'

import { Progress } from '@/components/ui/progress'

export function PantallaCargandoSiac({
  mensaje = 'Cargando sesión SIAC…',
  subtitulo = 'Validando credenciales institucionales',
}: {
  mensaje?: string
  subtitulo?: string
}) {
  return (
    <div className="fondo-app fixed inset-0 z-50 flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-primary/10 bg-white/95 p-8 text-center shadow-xl backdrop-blur-sm">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <ShieldCheck className="size-8 animate-pulse" />
        </div>
        <p className="text-base font-semibold text-primary">{mensaje}</p>
        <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p>
        <Progress value={66} className="mt-6 h-2 [&>div]:animate-pulse" />
        <p className="mt-3 text-xs text-muted-foreground">Corporación Universitaria Autónoma del Cauca</p>
      </div>
    </div>
  )
}
