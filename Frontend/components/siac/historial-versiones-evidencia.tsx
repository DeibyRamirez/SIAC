'use client'

import { useEffect, useState } from 'react'
import { Download, GitCompare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ComparadorVersionesDocx } from '@/components/siac/comparador-versiones-docx'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { obtenerBlobDocxEvidenciaApi } from '@/lib/servicios/descarga-binaria'
import {
  listarVersionesApi,
  type EvidenciaVersionApi,
} from '@/lib/servicios/evidencias.servicio'
import { formatearFechaHora } from '@/lib/utilidades-siac'

interface HistorialVersionesEvidenciaProps {
  evidenciaId: string
  versionActiva?: number
}

export function HistorialVersionesEvidencia({
  evidenciaId,
  versionActiva,
}: HistorialVersionesEvidenciaProps) {
  const [versiones, setVersiones] = useState<EvidenciaVersionApi[]>([])
  const [cargando, setCargando] = useState(true)
  const [descargandoNumero, setDescargandoNumero] = useState<number | null>(null)
  const [comparacion, setComparacion] = useState<{ a: number; b: number } | null>(
    null,
  )

  useEffect(() => {
    async function cargar() {
      if (!apiDisponible()) {
        setCargando(false)
        return
      }
      try {
        const lista = await listarVersionesApi(evidenciaId)
        setVersiones(lista)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [evidenciaId])

  async function descargarVersion(numero: number) {
    setDescargandoNumero(numero)
    try {
      const version = versiones.find((v) => v.numero === numero)
      const blob = await obtenerBlobDocxEvidenciaApi(evidenciaId, numero)
      const nombre =
        version?.nombreArchivo?.toLowerCase().endsWith('.docx')
          ? version.nombreArchivo
          : `${version?.nombreArchivo ?? 'evidencia'}.docx`
      const enlace = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = enlace
      anchor.download = nombre
      anchor.click()
      URL.revokeObjectURL(enlace)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudo preparar el documento para descarga.',
      )
    } finally {
      setDescargandoNumero(null)
    }
  }

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando historial de versiones…</p>
  }

  if (versiones.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historial de versiones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {versiones.map((version) => (
          <div
            key={version.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">v{version.numero}</span>
                {versionActiva === version.numero && (
                  <Badge variant="secondary">Activa</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{version.nombreArchivo}</p>
              <p className="text-xs text-muted-foreground">
                {version.subidoPor?.nombre ?? 'Usuario'} ·{' '}
                {formatearFechaHora(version.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {version.numero > 1 && apiDisponible() && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setComparacion({ a: version.numero - 1, b: version.numero })
                  }
                >
                  <GitCompare className="size-4" />
                  Ver cambios
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={descargandoNumero !== null}
                onClick={() => descargarVersion(version.numero)}
              >
                {descargandoNumero === version.numero ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                {descargandoNumero === version.numero ? 'Preparando…' : 'Descargar'}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog
        open={comparacion !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setComparacion(null)
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Cambios entre versiones
              {comparacion ? ` v${comparacion.a} → v${comparacion.b}` : ''}
            </DialogTitle>
          </DialogHeader>
          {comparacion && (
            <ComparadorVersionesDocx
              evidenciaId={evidenciaId}
              versionA={comparacion.a}
              versionB={comparacion.b}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
