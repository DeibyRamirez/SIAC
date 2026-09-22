'use client'

import { useEffect, useMemo, useState } from 'react'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { BarraHerramientasTabla } from '@/components/siac/barra-herramientas-tabla'
import { RejillaProgramas } from '@/components/siac/rejilla-programas'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ROLES_CONSULTA_INSTITUCIONAL } from '@/lib/auth-mock'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { programasSemilla } from '@/lib/datos-semilla'
import { listarProgramasApi } from '@/lib/servicios/programas.servicio'
import type { Programa } from '@/lib/tipos'
import { manejarCambioSelect } from '@/lib/utilidades-siac'

export default function ProgramasAdministradorPage() {
  return (
    <PlantillaPaginaApp titulo="Programas académicos" roles={ROLES_CONSULTA_INSTITUCIONAL}>
      <ContenidoProgramas />
    </PlantillaPaginaApp>
  )
}

function ContenidoProgramas() {
  const [busqueda, setBusqueda] = useState('')
  const [nivel, setNivel] = useState('todos')
  const [programas, setProgramas] = useState<Programa[]>(programasSemilla)

  useEffect(() => {
    async function cargar() {
      if (!apiDisponible()) return
      try {
        const lista = await listarProgramasApi()
        if (lista.length > 0) setProgramas(lista)
      } catch {
        // Mantiene semilla como fallback
      }
    }
    cargar()
  }, [])

  const programasFiltrados = useMemo(() => {
    return programas.filter((programa) => {
      const coincideTexto =
        programa.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        programa.codigo.toLowerCase().includes(busqueda.toLowerCase())
      const coincideNivel = nivel === 'todos' || programa.nivel === nivel
      return coincideTexto && coincideNivel
    })
  }, [busqueda, nivel, programas])

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Catálogo académico"
        titulo="Programas académicos"
        descripcion={`Monitorea el avance de ${programas.length} programas en proceso de acreditación (pregrado y posgrado).`}
      />

      <BarraHerramientasTabla
        placeholder="Buscar programa…"
        valorBusqueda={busqueda}
        onBuscar={setBusqueda}
      >
        <Select value={nivel} onValueChange={manejarCambioSelect(setNivel)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Nivel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los niveles</SelectItem>
            <SelectItem value="Pregrado">Pregrado</SelectItem>
            <SelectItem value="Posgrado">Posgrado</SelectItem>
          </SelectContent>
        </Select>
      </BarraHerramientasTabla>

      <RejillaProgramas
        programas={programasFiltrados}
        enlaceDetalle={(id) => `/administrador/programas/${id}`}
      />
    </div>
  )
}
