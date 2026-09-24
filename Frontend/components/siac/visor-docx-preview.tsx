'use client'

import { useEffect, useRef, useState } from 'react'
import { renderAsync } from 'docx-preview'

import { cn } from '@/lib/utils'

interface VisorDocxPreviewProps {
  cargarDocumento: () => Promise<ArrayBuffer>
  claveRecarga?: string | number
  className?: string
}

export function VisorDocxPreview({
  cargarDocumento,
  claveRecarga,
  className,
}: VisorDocxPreviewProps) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

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

  return (
    <div className={cn('relative h-full min-h-0 bg-white', className)}>
      <div className="absolute inset-0 overflow-x-auto overflow-y-auto p-4">
        <div ref={contenedorRef} className="docx-preview-contenedor mx-auto max-w-full" />
      </div>
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
