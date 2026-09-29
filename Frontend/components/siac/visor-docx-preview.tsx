'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { renderAsync } from 'docx-preview'
import { MessageSquarePlus } from 'lucide-react'

import {
  capturarSeleccion,
  resaltarCita,
  type SeleccionDocx,
} from '@/lib/utilidades/seleccion-docx'
import {
  anotarCambiosEnPreview,
  limpiarAnotaciones,
  type LineaAnotacion,
} from '@/lib/utilidades/anotar-diff-docx'
import { cn } from '@/lib/utils'

interface VisorDocxPreviewProps {
  cargarDocumento: () => Promise<ArrayBuffer>
  claveRecarga?: string | number
  className?: string
  /** Habilita el control flotante "Comentar" al seleccionar texto. */
  permitirSeleccion?: boolean
  onComentarSeleccion?: (seleccion: SeleccionDocx) => void
  /** Ancla a resaltar/desplazar cuando el revisor/cargador pulsa un comentario. */
  anclaResaltada?: { anchor?: string; quote?: string; nonce: number }
  /** Cambios del diff a superponer inline sobre el documento renderizado. */
  anotaciones?: LineaAnotacion[]
}

export function VisorDocxPreview({
  cargarDocumento,
  claveRecarga,
  className,
  permitirSeleccion = false,
  onComentarSeleccion,
  anclaResaltada,
  anotaciones,
}: VisorDocxPreviewProps) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const externoRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [popover, setPopover] = useState<{ top: number; left: number } | null>(null)
  const [seleccionPendiente, setSeleccionPendiente] =
    useState<SeleccionDocx | null>(null)

  useEffect(() => {
    const contenedor = contenedorRef.current
    if (!contenedor) return

    let cancelado = false

    async function renderizar() {
      const nodo = contenedorRef.current
      if (!nodo) return
      setCargando(true)
      setError(null)
      try {
        const buffer = await cargarDocumento()
        if (cancelado) return
        nodo.innerHTML = ''
        await renderAsync(buffer, nodo, undefined, {
          className: 'docx-preview-siac',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
        })
      } catch {
        if (!cancelado) {
          setError('No se pudo previsualizar el documento Word.')
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    renderizar()

    return () => {
      cancelado = true
    }
  }, [cargarDocumento, claveRecarga])

  useEffect(() => {
    if (cargando || !anclaResaltada) return
    const contenedor = contenedorRef.current
    if (!contenedor) return
    resaltarCita(contenedor, {
      anchor: anclaResaltada.anchor,
      quote: anclaResaltada.quote,
    })
  }, [anclaResaltada, cargando])

  useEffect(() => {
    if (cargando) return
    const contenedor = contenedorRef.current
    if (!contenedor) return
    limpiarAnotaciones(contenedor)
    if (!anotaciones || anotaciones.length === 0) return
    anotarCambiosEnPreview(contenedor, anotaciones)
    return () => limpiarAnotaciones(contenedor)
  }, [anotaciones, cargando, claveRecarga])

  const manejarSeleccion = useCallback(() => {
    if (!permitirSeleccion || !onComentarSeleccion) return
    window.setTimeout(() => {
      const contenedor = contenedorRef.current
      const externo = externoRef.current
      if (!contenedor || !externo) return
      const seleccion = capturarSeleccion(contenedor)
      const rango = window.getSelection()?.rangeCount
        ? window.getSelection()!.getRangeAt(0)
        : null
      if (!seleccion || !rango) {
        setPopover(null)
        setSeleccionPendiente(null)
        return
      }
      const rect = rango.getBoundingClientRect()
      const base = externo.getBoundingClientRect()
      const left = Math.min(Math.max(8, rect.left - base.left), Math.max(8, base.width - 150))
      const top = Math.max(8, rect.top - base.top - 42)
      setSeleccionPendiente(seleccion)
      setPopover({ top, left })
    }, 0)
  }, [permitirSeleccion, onComentarSeleccion])

  function confirmarComentario() {
    if (seleccionPendiente && onComentarSeleccion) {
      onComentarSeleccion(seleccionPendiente)
    }
    window.getSelection()?.removeAllRanges()
    setPopover(null)
    setSeleccionPendiente(null)
  }

  return (
    <div
      ref={externoRef}
      className={cn('relative h-full min-h-0 bg-white', className)}
    >
      <div
        className="absolute inset-0 overflow-x-auto overflow-y-auto p-4"
        onMouseUp={manejarSeleccion}
        onTouchEnd={manejarSeleccion}
        onKeyUp={manejarSeleccion}
        onScroll={() => setPopover(null)}
      >
        <div ref={contenedorRef} className="docx-preview-contenedor mx-auto max-w-full" />
      </div>

      {popover && (
        <button
          type="button"
          style={{ top: popover.top, left: popover.left }}
          className="absolute z-20 flex items-center gap-1 rounded-full bg-fucsia px-3 py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-fucsia/90"
          onMouseDown={(e) => e.preventDefault()}
          onClick={confirmarComentario}
        >
          <MessageSquarePlus className="size-3.5" />
          Comentar
        </button>
      )}

      {cargando && (
        <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-muted-foreground">
          Generando vista previa…
        </p>
      )}
      {error && (
        <p className="absolute inset-0 z-10 flex items-center justify-center bg-white px-4 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
