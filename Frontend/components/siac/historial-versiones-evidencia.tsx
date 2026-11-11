'use client'

import { useEffect, useState } from 'react'
import { Download, GitCompare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { RegionCarga } from '@/components/siac/estado-carga-lista'
import { EsqueletoFilas } from '@/components/siac/esqueletos'
import { ComparadorVersionesDocx } from '@/components/siac/comparador-versiones-docx'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { etiquetaRol } from '@/lib/auth-mock'
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
        setVersiones(await listarVersionesApi(evidenciaId))
      } finally {
        setCargando(false)
      }
    }
    void cargar()
  }, [evidenciaId])

  async function descargarVersion(numero: number) {
    setDescargandoNumero(numero)
    try {
      const version = versiones.find((v) => v.numero === numero)
      const blob = await obtenerBlobDocxEvidenciaApi(evidenciaId, numero)
      const nombre = version?.nombreArchivo?.toLowerCase().endsWith('.docx')
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
    return (
      <RegionCarga texto="Cargando versiones…">
        <EsqueletoFilas filas={3} />
      </RegionCarga>
    )
  }

  if (versiones.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historial de versiones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {versiones.map((version) => (
          <div
            key={version.id}
            className="rounded-lg border p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-primary">v{version.numero}</span>
              {versionActiva === version.numero ? (
                <Badge variant="secondary">Activa</Badge>
              ) : (
                <Badge variant="outline">Anterior</Badge>
              )}
              {version.subidoPorRol === 'Revisor' ? (
                <Badge variant="outline" className="border-fucsia/30 text-fucsia">
                  Subida por revisor
                </Badge>
              ) : null}
            </div>
            <p
              className="mt-2 line-clamp-2 break-words text-sm text-muted-foreground"
              title={version.nombreArchivo}
            >
              {version.nombreArchivo}
            </p>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {version.subidoPor?.nombre ?? 'Usuario'}
              {version.subidoPorRol
                ? ` · ${etiquetaRol(version.subidoPorRol)}`
                : ''}
            </p>
            <p className="mt-0.5 whitespace-nowrap text-xs text-muted-foreground">
              {formatearFechaHora(version.createdAt)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {version.numero > 1 && apiDisponible() ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  aria-label={`Ver cambios de v${version.numero - 1} a v${version.numero}`}
                  onClick={() =>
                    setComparacion({ a: version.numero - 1, b: version.numero })
                  }
                >
                  <GitCompare className="size-4" aria-hidden />
                  Ver cambios
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={`Descargar versión ${version.numero}`}
                disabled={descargandoNumero !== null}
                onClick={() => void descargarVersion(version.numero)}
              >
                {descargandoNumero === version.numero ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="size-4" aria-hidden />
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
          {comparacion ? (
            <ComparadorVersionesDocx
              evidenciaId={evidenciaId}
              versionA={comparacion.a}
              versionB={comparacion.b}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
