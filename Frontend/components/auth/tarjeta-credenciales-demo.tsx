'use client'

import { Copy, ShieldCheck, Upload, UserCheck, UserCog } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { usuariosSemilla } from '@/lib/datos-semilla/usuarios'
import type { RolUsuario } from '@/lib/tipos'
import { cn } from '@/lib/utils'

const iconosPorRol: Partial<Record<RolUsuario, typeof ShieldCheck>> = {
  Administrador: ShieldCheck,
  Revisor: UserCheck,
  Cargador: Upload,
  SuperAdmin: UserCog,
}

const coloresPorRol: Partial<Record<RolUsuario, string>> = {
  Administrador: 'border-primary/30 bg-accent',
  Revisor: 'border-esmeralda/30 bg-accent',
  Cargador: 'border-cyan-tecnico/30 bg-secondary',
  SuperAdmin: 'border-purpura/30 bg-accent',
}

async function copiarAlPortapapeles(valor: string, etiqueta: string) {
  try {
    await navigator.clipboard.writeText(valor)
    toast.success(`${etiqueta} copiado al portapapeles`)
  } catch {
    toast.error('No se pudo copiar. Intenta de nuevo.')
  }
}

export function TarjetaCredencialesDemo() {
  return (
    <aside className="w-full max-w-sm space-y-4">
      <div className="tarjeta-institucional rounded-md border border-border bg-white px-4 py-3">
        <h2 className="text-sm font-semibold text-primary">Accesos de demostración SIAC</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Usa los botones para copiar correo y contraseña de cada rol y pegarlos en el formulario.
        </p>
      </div>

      {usuariosSemilla.map((usuario) => {
        const Icono = iconosPorRol[usuario.rol] ?? ShieldCheck
        return (
          <div
            key={usuario.id}
            className={cn(
              'tarjeta-institucional rounded-md border p-4',
              coloresPorRol[usuario.rol] ?? 'border-primary/30 bg-accent',
            )}
          >
            <div className="mb-3 flex items-center gap-2">
              <Icono className="size-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">{usuario.rol}</p>
                <p className="text-xs text-muted-foreground">{usuario.nombre}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="rounded-lg border border-border bg-white px-2 py-1.5">
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Correo</p>
                <p className="truncate text-xs text-foreground">{usuario.correo}</p>
              </div>
              <div className="rounded-lg border border-border bg-white px-2 py-1.5">
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Contraseña</p>
                <p className="text-xs text-foreground">{usuario.contrasena}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => copiarAlPortapapeles(usuario.correo, 'Correo')}
              >
                <Copy className="size-3" />
                Copiar correo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => copiarAlPortapapeles(usuario.contrasena, 'Contraseña')}
              >
                <Copy className="size-3" />
                Copiar contraseña
              </Button>
            </div>
          </div>
        )
      })}
    </aside>
  )
}
