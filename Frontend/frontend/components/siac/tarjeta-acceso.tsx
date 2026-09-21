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
}: {
  titulo: string
  descripcion: string
  href: string
  icono: LucideIcon
  detalle?: string
}) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-[#e3f2ef] text-[#3a9c98]">
            <Icono className="size-5" />
          </div>
          <CardTitle>{titulo}</CardTitle>
          <CardDescription>{descripcion}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm text-[#3a9c98]">
          <span>{detalle ?? 'Abrir módulo'}</span>
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
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
}: {
  etiqueta: string
  titulo: string
  descripcion: string
  accion?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#3a9c98] uppercase">
          {etiqueta}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#102f55]">{titulo}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{descripcion}</p>
      </div>
      {accion}
    </div>
  )
}

export function PanelVacio({ mensaje }: { mensaje: string }) {
  return (
    <div className={cn('rounded-xl border border-dashed bg-white p-10 text-center text-sm text-muted-foreground')}>
      {mensaje}
    </div>
  )
}
