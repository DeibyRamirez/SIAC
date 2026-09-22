import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function TarjetaAcceso({
  titulo,
  descripcion,
  href,
  icono: Icono,
  detalle,
  acento = 'cyan',
}: {
  titulo: string
  descripcion: string
  href: string
  icono: LucideIcon
  detalle?: string
  acento?: 'cyan' | 'esmeralda' | 'purpura' | 'coral'
}) {
  const iconoClases = {
    cyan: 'bg-cyan-tecnico/15 text-cyan-tecnico',
    esmeralda: 'bg-esmeralda/15 text-esmeralda',
    purpura: 'bg-purpura/15 text-purpura',
    coral: 'bg-coral/15 text-coral',
  }

  return (
    <Link href={href} className="group block">
      <Card className="h-full transition-all hover:-translate-y-1 hover:shadow-lg">
        <CardHeader>
          <div
            className={cn(
              'mb-2 flex size-11 items-center justify-center rounded-xl',
              iconoClases[acento],
            )}
          >
            <Icono className="size-5" />
          </div>
          <CardTitle>{titulo}</CardTitle>
          <CardDescription>{descripcion}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm font-semibold text-cyan-tecnico">
          <span>{detalle ?? 'Abrir módulo'}</span>
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </CardContent>
      </Card>
    </Link>
  )
}

export function EncabezadoPagina({
  etiqueta,
  titulo,
  descripcion,
  accion,
  className,
}: {
  etiqueta: string
  titulo: string
  descripcion: string
  accion?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="borde-institucional">
        <p className="etiqueta-seccion">{etiqueta}</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-primary md:text-3xl">
          {titulo}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{descripcion}</p>
      </div>
      {accion}
    </div>
  )
}

export function PanelVacio({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-primary/20 bg-white/80 p-10 text-center text-sm text-muted-foreground">
      {mensaje}
    </div>
  )
}
