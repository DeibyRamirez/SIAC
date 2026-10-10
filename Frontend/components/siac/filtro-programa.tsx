'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { listarProgramasApi } from '@/lib/servicios/programas.servicio'
import type { Programa } from '@/lib/tipos'
import { suscribirProgramasActualizados } from '@/lib/utilidades/eventos-programas'
import { itemsSelectProgramas, manejarCambioSelect } from '@/lib/utilidades-siac'

interface FiltroProgramaProps {
  valor: string
  onCambiar: (programaId: string) => void
  className?: string
  /** Cuando es true, el valor devuelto es el slug (para URL ?programa=derecho). */
  usarSlug?: boolean
}

export function FiltroPrograma({
  valor,
  onCambiar,
  className,
  usarSlug = false,
}: FiltroProgramaProps) {
  const [programas, setProgramas] = useState<Programa[]>([])

  useEffect(() => {
    async function cargar() {
      if (!apiDisponible()) return
      try {
        const lista = await listarProgramasApi()
        setProgramas(lista)
      } catch {
        setProgramas([])
      }
    }
    void cargar()
    return suscribirProgramasActualizados(() => {
      void cargar()
    })
  }, [])

  const opcionesPrograma = useMemo(
    () => [
      { value: 'todos', label: 'Todas las carreras' },
      ...itemsSelectProgramas(programas, { incluirNivel: true, usarSlug }),
    ],
    [programas, usarSlug],
  )

  return (
    <Select
      value={valor}
      items={opcionesPrograma}
      onValueChange={manejarCambioSelect(onCambiar)}
    >
      <SelectTrigger className={className ?? 'w-[220px]'}>
        <SelectValue placeholder="Todas las carreras" />
      </SelectTrigger>
      <SelectContent>
        {opcionesPrograma.map((opcion) => (
          <SelectItem key={opcion.value} value={opcion.value}>
            {opcion.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
