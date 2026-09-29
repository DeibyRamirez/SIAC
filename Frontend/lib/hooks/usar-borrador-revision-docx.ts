'use client'

import { useEffect, useRef } from 'react'

import {
  crearEstadosCondicionIniciales,
  type DecisionCondicion,
  type EstadoCondicionDictamen,
} from '@/components/siac/checklist-condiciones-documento-maestro'

export interface ComentarioInlineRevision {
  id: string
  /** Ancla a un hunk del diff (modo "Ver cambios"). */
  hunkId?: string
  /** Ancla de selección de texto en el preview ("inicio:fin" de offsets). */
  anchor?: string
  quote?: string
  body: string
  createdAt: string
  updatedAt: string
}

interface BorradorRevision {
  condiciones: EstadoCondicionDictamen[]
  observacionesGenerales: string
  comentariosInline: ComentarioInlineRevision[]
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
    referenciaPrevia:
      typeof cruda.referenciaPrevia === 'string' ? cruda.referenciaPrevia : undefined,
  }
}

function normalizarComentario(crudo: unknown): ComentarioInlineRevision | null {
  if (!crudo || typeof crudo !== 'object') return null
  const datos = crudo as Record<string, unknown>
  if (typeof datos.body !== 'string') return null
  const hunkId = typeof datos.hunkId === 'string' ? datos.hunkId : undefined
  const anchor = typeof datos.anchor === 'string' ? datos.anchor : undefined
  const quote =
    typeof datos.quote === 'string'
      ? datos.quote
      : typeof datos.cita === 'string'
        ? datos.cita
        : undefined
  return {
    id:
      typeof datos.id === 'string'
        ? datos.id
        : `${hunkId ?? anchor ?? 'comentario'}-${Date.now()}`,
    hunkId,
    anchor,
    quote,
    body: datos.body,
    createdAt:
      typeof datos.createdAt === 'string'
        ? datos.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof datos.updatedAt === 'string'
        ? datos.updatedAt
        : new Date().toISOString(),
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

  const comentariosReducer = (
    acumulado: ComentarioInlineRevision[],
    item: unknown,
  ): ComentarioInlineRevision[] => {
    const comentario = normalizarComentario(item)
    if (comentario) acumulado.push(comentario)
    return acumulado
  }

  return {
    observacionesGenerales:
      typeof datos.observacionesGenerales === 'string'
        ? datos.observacionesGenerales
        : '',
    condiciones: base.map((item) => porCodigo.get(item.codigo) ?? item),
    comentariosInline: Array.isArray(datos.comentariosInline)
      ? datos.comentariosInline.reduce(comentariosReducer, [])
      : [],
  }
}

function claveBorrador(
  evidenciaId: string,
  version: number,
  usuarioId: string | null,
): string {
  return `siac:borrador-revision:${usuarioId ?? 'anon'}:${evidenciaId}:${version}`
}

export function leerBorradorRevision(
  evidenciaId: string,
  version: number,
  usuarioId: string | null = null,
): BorradorRevision | null {
  if (typeof window === 'undefined') return null
  try {
    const crudo = localStorage.getItem(claveBorrador(evidenciaId, version, usuarioId))
    if (!crudo) return null
    return normalizarBorradorRevision(JSON.parse(crudo))
  } catch {
    return null
  }
}

export function limpiarBorradorRevision(
  evidenciaId: string,
  version: number,
  usuarioId: string | null = null,
): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(claveBorrador(evidenciaId, version, usuarioId))
}

export function usarBorradorRevisionDocx(
  evidenciaId: string,
  version: number,
  usuarioId: string | null,
  condiciones: EstadoCondicionDictamen[],
  observacionesGenerales: string,
  comentariosInline: ComentarioInlineRevision[],
  onRestaurar: (borrador: BorradorRevision) => void,
): void {
  const hidratoRef = useRef(false)

  useEffect(() => {
    if (hidratoRef.current) return
    const guardado = leerBorradorRevision(evidenciaId, version, usuarioId)
    if (guardado) {
      onRestaurar(guardado)
    }
    hidratoRef.current = true
  }, [evidenciaId, version, usuarioId, onRestaurar])

  useEffect(() => {
    if (!hidratoRef.current) return
    const temporizador = window.setTimeout(() => {
      try {
        localStorage.setItem(
          claveBorrador(evidenciaId, version, usuarioId),
          JSON.stringify({ condiciones, observacionesGenerales, comentariosInline }),
        )
      } catch {
        // Almacenamiento no disponible
      }
    }, 320)
    return () => window.clearTimeout(temporizador)
  }, [
    evidenciaId,
    version,
    usuarioId,
    condiciones,
    observacionesGenerales,
    comentariosInline,
  ])
}
