'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface InputContrasenaConOjoProps {
  id?: string
  value: string
  onChange: (valor: string) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function InputContrasenaConOjo({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  disabled,
  className,
}: InputContrasenaConOjoProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        className={cn('pr-10', className)}
      />
      <button
        type="button"
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  )
}
