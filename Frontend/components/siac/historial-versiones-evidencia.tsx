'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  listarVersionesApi,
  obtenerUrlDescargaApi,
  type EvidenciaVersionApi,
} from '@/lib/servicios/evidencias.servicio'
import { formatearFecha } from '@/lib/utilidades-siac'

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
    const { url } = await obtenerUrlDescargaApi(evidenciaId, numero)
    window.open(url, '_blank')
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
                {formatearFecha(version.createdAt.slice(0, 10))}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => descargarVersion(version.numero)}
            >
              <Download className="size-4" />
              Descargar
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
