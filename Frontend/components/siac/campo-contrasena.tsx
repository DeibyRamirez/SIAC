'use client'

import { Check } from 'lucide-react'

import { InputContrasenaConOjo } from '@/components/ui/input-contrasena'
import { cn } from '@/lib/utils'
import {
  criteriosContrasena,
  MENSAJE_POLITICA_CONTRASENA,
} from '@/lib/utilidades/politica-contrasena'

const ITEMS_CHECKLIST = [
  { clave: 'longitud' as const, etiqueta: 'Mínimo 8 caracteres' },
  { clave: 'letra' as const, etiqueta: 'Al menos una letra' },
  { clave: 'mayuscula' as const, etiqueta: 'Al menos una mayúscula' },
  { clave: 'numero' as const, etiqueta: 'Al menos un número' },
  { clave: 'simbolo' as const, etiqueta: 'Al menos un símbolo' },
]

export interface CampoContrasenaProps {
  id?: string
  label: string
  value: string
  onChange: (valor: string) => void
  required?: boolean
  placeholder?: string
  autoComplete?: string
  mostrarAyuda?: boolean
  mostrarChecklist?: boolean
}

export function CampoContrasena({
  id,
  label,
  value,
  onChange,
  required,
  placeholder,
  autoComplete = 'new-password',
  mostrarAyuda = true,
  mostrarChecklist = true,
}: CampoContrasenaProps) {
  const criterios = criteriosContrasena(value)
  const mostrarLista = mostrarChecklist && value.length > 0

  return (
    <label className="block space-y-2 text-sm" htmlFor={id}>
      <span className="font-medium">{label}</span>
      <InputContrasenaConOjo
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
      />
      {mostrarAyuda ? (
        <p className="text-xs text-muted-foreground">{MENSAJE_POLITICA_CONTRASENA}</p>
      ) : null}
      {mostrarLista ? (
        <ul className="space-y-1 text-xs" aria-live="polite">
          {ITEMS_CHECKLIST.map((item) => {
            const cumple = criterios[item.clave]
            return (
              <li
                key={item.clave}
                className={cn(
                  'flex items-center gap-1.5',
                  cumple ? 'text-esmeralda font-medium' : 'text-muted-foreground',
                )}
              >
                <Check className={cn('size-3.5 shrink-0', cumple ? 'opacity-100' : 'opacity-30')} />
                {item.etiqueta}
              </li>
            )
          })}
        </ul>
      ) : null}
    </label>
  )
}
