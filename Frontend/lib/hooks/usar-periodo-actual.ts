'use client'

import { useEffect, useState } from 'react'

import { apiDisponible } from '@/lib/servicios/cliente-api'
import { obtenerPeriodoActualApi } from '@/lib/servicios/evidencias.servicio'
import { FORMATO_PERIODO, periodoAcademicoActual } from '@/lib/utilidades/periodo-academico'

/**
 * Periodo vigente del servidor (America/Bogota). Si la API no responde,
 * se usa el mismo cálculo en el navegador.
 */
export function usarPeriodoActual(): { periodo: string; listo: boolean } {
  const [periodo, setPeriodo] = useState(periodoAcademicoActual)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    if (!apiDisponible()) {
      setListo(true)
      return
    }
    let vigente = true
    obtenerPeriodoActualApi()
      .then((valor) => {
        if (!vigente) return
        setPeriodo(FORMATO_PERIODO.test(valor) ? valor : periodoAcademicoActual())
      })
      .catch(() => {
        if (vigente) setPeriodo(periodoAcademicoActual())
      })
      .finally(() => {
        if (vigente) setListo(true)
      })
    return () => {
      vigente = false
    }
  }, [])

  return { periodo, listo }
}
