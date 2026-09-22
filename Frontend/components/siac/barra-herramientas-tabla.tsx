import type { LucideIcon } from 'lucide-react'
import { Filter, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface BarraHerramientasTablaProps {
  placeholder?: string
  valorBusqueda?: string
  onBuscar?: (valor: string) => void
  textoBoton?: string
  onAccionPrincipal?: () => void
  iconoBoton?: LucideIcon
  accionSecundaria?: { etiqueta: string; onClick: () => void }
  children?: React.ReactNode
}

export function BarraHerramientasTabla({
  placeholder = 'Buscar…',
  valorBusqueda = '',
  onBuscar,
  textoBoton,
  onAccionPrincipal,
  iconoBoton: IconoBoton = Plus,
  accionSecundaria,
  children,
}: BarraHerramientasTablaProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {onBuscar && (
          <Input
            placeholder={placeholder}
            value={valorBusqueda}
            onChange={(evento) => onBuscar(evento.target.value)}
            className="max-w-md"
          />
        )}
        {children}
      </div>
      <div className="flex shrink-0 gap-2">
        {accionSecundaria && (
          <Button variant="outline" onClick={accionSecundaria.onClick}>
            <Filter className="size-4" />
            {accionSecundaria.etiqueta}
          </Button>
        )}
        {textoBoton && onAccionPrincipal && (
          <Button onClick={onAccionPrincipal}>
            <IconoBoton className="size-4" />
            {textoBoton}
          </Button>
        )}
      </div>
    </div>
  )
}
