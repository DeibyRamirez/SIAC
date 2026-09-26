'use client'

import { FileText, Upload } from 'lucide-react'
import { useRef, useState } from 'react'

import { cn } from '@/lib/utils'

interface ZonaCargaDocxProps {
  archivo: File | null
  onArchivoSeleccionado: (archivo: File | null) => void
  deshabilitado?: boolean
  className?: string
}

export function ZonaCargaDocx({
  archivo,
  onArchivoSeleccionado,
  deshabilitado = false,
  className,
}: ZonaCargaDocxProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)

  function procesarArchivo(file: File | undefined) {
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension !== 'docx') {
      return
    }
    onArchivoSeleccionado(file)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter' || evento.key === ' ') {
            inputRef.current?.click()
          }
        }}
        onDragEnter={(evento) => {
          evento.preventDefault()
          if (!deshabilitado) setArrastrando(true)
        }}
        onDragOver={(evento) => {
          evento.preventDefault()
          if (!deshabilitado) setArrastrando(true)
        }}
        onDragLeave={(evento) => {
          evento.preventDefault()
          setArrastrando(false)
        }}
        onDrop={(evento) => {
          evento.preventDefault()
          setArrastrando(false)
          if (deshabilitado) return
          procesarArchivo(evento.dataTransfer.files?.[0])
        }}
        onClick={() => !deshabilitado && inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
          arrastrando
            ? 'border-esmeralda bg-esmeralda/10'
            : 'border-primary/25 bg-accent/20 hover:border-primary/40 hover:bg-accent/40',
          deshabilitado && 'cursor-not-allowed opacity-60',
        )}
      >
        <Upload className="mb-3 size-8 text-primary" aria-hidden />
        <p className="text-sm font-medium text-primary">
          Seleccione o arrastre su archivo aquí
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Solo documentos Microsoft Word (.docx)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          disabled={deshabilitado}
          onChange={(evento) => procesarArchivo(evento.target.files?.[0])}
        />
      </div>

      {archivo && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/15 bg-white px-3 py-2">
          <FileText className="size-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-primary">{archivo.name}</p>
            <p className="text-xs text-muted-foreground">.docx</p>
          </div>
        </div>
      )}
    </div>
  )
}
