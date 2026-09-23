'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { HistorialVersionesEvidencia } from '@/components/siac/historial-versiones-evidencia'
import { InsigniaEstado } from '@/components/siac/insignia-estado'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { VisorDocumentoInline } from '@/components/siac/visor-documento-inline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ROLES_CONSULTA_INSTITUCIONAL } from '@/lib/auth-mock'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { obtenerEvidenciaApi, obtenerUrlDescargaApi } from '@/lib/servicios/evidencias.servicio'
import type { Evidencia } from '@/lib/tipos'
import { formatearFecha, obtenerNombrePrograma } from '@/lib/utilidades-siac'

export default function DetalleEvidenciaAdminPage() {
  return (
    <PlantillaPaginaApp titulo="Detalle de evidencia" roles={ROLES_CONSULTA_INSTITUCIONAL}>
      <ContenidoDetalleAdmin />
    </PlantillaPaginaApp>
  )
}

function ContenidoDetalleAdmin() {
  const params = useParams<{ id: string }>()
  const [evidencia, setEvidencia] = useState<Evidencia | null>(null)
  const [urlDocumento, setUrlDocumento] = useState<string | undefined>()
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setError(null)
      try {
        if (!apiDisponible()) {
          setError('API no disponible.')
          return
        }
        const [ev, descarga] = await Promise.all([
          obtenerEvidenciaApi(params.id),
          obtenerUrlDescargaApi(params.id).catch(() => null),
        ])
        setEvidencia({
          ...ev,
          fechaCarga:
            typeof ev.fechaCarga === 'string'
              ? ev.fechaCarga.slice(0, 10)
              : new Date().toISOString().slice(0, 10),
        })
        if (descarga?.url) {
          setUrlDocumento(descarga.url)
        } else {
          setError('No hay archivo asociado a esta evidencia en el almacenamiento.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la evidencia.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [params.id])

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando evidencia…</p>
  }

  if (!evidencia) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{error ?? 'Evidencia no encontrada.'}</p>
        <Link href="/administrador/evidencias">
          <Button variant="outline">Volver al listado</Button>
        </Link>
      </div>
    )
  }

  const extension = evidencia.nombreArchivo.split('.').pop()?.toLowerCase()
  const formato = extension === 'xlsx' ? 'XLSX' : 'PDF'
  const versionActual = evidencia.version ?? 1

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Consulta documental"
        titulo={evidencia.nombre}
        descripcion="Visualización de evidencia. Solo lectura."
        accion={
          <Link href="/administrador/evidencias">
            <Button variant="outline">Volver al listado</Button>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        <InsigniaEstado estado={evidencia.estado} />
        <Badge variant="secondary">Versión {versionActual}</Badge>
      </div>

      {error && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <VisorDocumentoInline
          titulo={evidencia.nombreArchivo}
          urlDocumento={urlDocumento}
          formato={formato}
          claveCache={versionActual}
          evidenciaId={evidencia.id}
          versionDocumento={versionActual}
        />
        <Card>
          <CardContent className="space-y-4 pt-6 text-sm">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Programa</p>
              <p>{obtenerNombrePrograma(evidencia.programaId)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Periodo</p>
              <p>{evidencia.periodo}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Factor</p>
              <p>{evidencia.factor}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Indicador</p>
              <p>{evidencia.indicador}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Archivo</p>
              <p>{evidencia.nombreArchivo}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Fecha de carga</p>
              <p>{formatearFecha(evidencia.fechaCarga)}</p>
            </div>
            {evidencia.observaciones && (
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase text-amber-800">Observaciones</p>
                <p className="mt-1 text-amber-900">{evidencia.observaciones}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <HistorialVersionesEvidencia evidenciaId={evidencia.id} versionActiva={versionActual} />
    </div>
  )
}
