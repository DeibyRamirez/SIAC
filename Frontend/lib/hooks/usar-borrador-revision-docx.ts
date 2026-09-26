'use client'

import { useEffect, useRef } from 'react'

import {
  crearEstadosCondicionIniciales,
  type DecisionCondicion,
  type EstadoCondicionDictamen,
} from '@/components/siac/checklist-condiciones-documento-maestro'

interface BorradorRevision {
  condiciones: EstadoCondicionDictamen[]
  observacionesGenerales: string
}

function normalizarCondicionBorrador(
  cruda: Record<string, unknown>,
): EstadoCondicionDictamen | null {
  const codigo = cruda.codigo
  if (typeof codigo !== 'string') return null

  let decision: DecisionCondicion = null
  if (cruda.decision === 'correcto' || cruda.decision === 'corregir') {
    decision = cruda.decision
  } else if (cruda.cumple === true) {
    decision = 'correcto'
  } else if (cruda.cumple === false) {
    decision = 'corregir'
  }

  return {
    codigo: codigo as EstadoCondicionDictamen['codigo'],
    decision,
    observacion: typeof cruda.observacion === 'string' ? cruda.observacion : '',
  }
}

function normalizarBorradorRevision(crudo: unknown): BorradorRevision | null {
  if (!crudo || typeof crudo !== 'object') return null
  const datos = crudo as Record<string, unknown>
  const base = crearEstadosCondicionIniciales()
  const lista = Array.isArray(datos.condiciones) ? datos.condiciones : []

  const porCodigo = new Map(
    lista
      .map((item) => normalizarCondicionBorrador(item as Record<string, unknown>))
      .filter((item): item is EstadoCondicionDictamen => item !== null)
      .map((item) => [item.codigo, item]),
  )

  return {
    observacionesGenerales:
      typeof datos.observacionesGenerales === 'string'
        ? datos.observacionesGenerales
        : '',
    condiciones: base.map((item) => porCodigo.get(item.codigo) ?? item),
  }
}

function claveBorrador(evidenciaId: string, version: number): string {
  return `siac:borrador-revision:${evidenciaId}:${version}`
}

export function leerBorradorRevision(
  evidenciaId: string,
  version: number,
): BorradorRevision | null {
  if (typeof window === 'undefined') return null
  try {
    const crudo = localStorage.getItem(claveBorrador(evidenciaId, version))
    if (!crudo) return null
    return normalizarBorradorRevision(JSON.parse(crudo))
  } catch {
    return null
  }
}

export function limpiarBorradorRevision(evidenciaId: string, version: number): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(claveBorrador(evidenciaId, version))
}

export function usarBorradorRevisionDocx(
  evidenciaId: string,
  version: number,
  condiciones: EstadoCondicionDictamen[],
  observacionesGenerales: string,
  onRestaurar: (borrador: BorradorRevision) => void,
): void {
  const hidratoRef = useRef(false)

  useEffect(() => {
    if (hidratoRef.current) return
    const guardado = leerBorradorRevision(evidenciaId, version)
    if (guardado) {
      onRestaurar(guardado)
    }
    hidratoRef.current = true
  }, [evidenciaId, version, onRestaurar])

  useEffect(() => {
    if (!hidratoRef.current) return
    const temporizador = window.setTimeout(() => {
      try {
        localStorage.setItem(
          claveBorrador(evidenciaId, version),
          JSON.stringify({ condiciones, observacionesGenerales }),
        )
      } catch {
        // Almacenamiento no disponible
      }
    }, 320)
    return () => window.clearTimeout(temporizador)
  }, [evidenciaId, version, condiciones, observacionesGenerales])
}
