'use client'

import { useEffect, useState } from 'react'

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
import { manejarCambioSelect } from '@/lib/utilidades-siac'

interface FiltroProgramaProps {
  valor: string
  onCambiar: (programaId: string) => void
  className?: string
}

export function FiltroPrograma({ valor, onCambiar, className }: FiltroProgramaProps) {
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
    cargar()
  }, [])

  return (
    <Select value={valor} onValueChange={manejarCambioSelect(onCambiar)}>
      <SelectTrigger className={className ?? 'w-[220px]'}>
        <SelectValue placeholder="Todas las carreras" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todas las carreras</SelectItem>
        {programas.map((programa) => (
          <SelectItem key={programa.id} value={programa.id}>
            {programa.nombre} ({programa.nivel})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
