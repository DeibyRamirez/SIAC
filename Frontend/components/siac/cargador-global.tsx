'use client'

import { Progress } from '@/components/ui/progress'

interface CargadorGlobalProps {
  visible: boolean
  mensaje: string
  progreso: number
}

export function CargadorGlobal({ visible, mensaje, progreso }: CargadorGlobalProps) {
  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/75 backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-primary/15 bg-white/95 p-6 shadow-xl">
        <p className="text-center text-sm font-semibold text-primary">{mensaje}</p>
        <Progress value={progreso} className="mt-4 h-2" />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Por favor espere…
        </p>
      </div>
    </div>
  )
}
