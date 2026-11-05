'use client'

import { useEffect, useMemo, useState } from 'react'

import { apiDisponible } from '@/lib/servicios/cliente-api'
import { listarPeriodosConDatosApi } from '@/lib/servicios/evidencias.servicio'
import { agruparPeriodos, type GruposPeriodos } from '@/lib/utilidades/periodo-academico'

/** Periodos vigentes + históricos con datos (los pasados sin documentos no se listan). */
export function usarPeriodos(seleccionado?: string | null): GruposPeriodos {
  const [conDatos, setConDatos] = useState<string[]>([])
  useEffect(() => {
    if (!apiDisponible()) return
    let vigente = true
    listarPeriodosConDatosApi()
      .then((lista) => vigente && setConDatos(lista))
      .catch(() => vigente && setConDatos([]))
    return () => {
      vigente = false
    }
  }, [])
  return useMemo(() => agruparPeriodos(conDatos, new Date(), seleccionado), [conDatos, seleccionado])
}
