'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { DialogoConfirmacion } from '@/components/siac/dialogo-confirmacion'
import { HistorialVersionesEvidencia } from '@/components/siac/historial-versiones-evidencia'
import { InsigniaEstado } from '@/components/siac/insignia-estado'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { VisorDocumentoInline } from '@/components/siac/visor-documento-inline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  enviarRevisionApi,
  obtenerEvidenciaApi,
  obtenerHistorialApi,
  obtenerUrlDescargaApi,
  actualizarEvidenciaApi,
  subirVersionArchivoApi,
} from '@/lib/servicios/evidencias.servicio'
import type { Evidencia } from '@/lib/tipos'
import { formatearFecha, obtenerNombrePrograma } from '@/lib/utilidades-siac'

export default function DetalleEvidenciaCargadorPage() {
  return (
    <PlantillaPaginaApp titulo="Detalle de evidencia" rol="Cargador">
      <ContenidoDetalle />
    </PlantillaPaginaApp>
  )
}

function ContenidoDetalle() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { datos, actualizarEvidencia } = usarAlmacen()
  const [evidencia, setEvidencia] = useState<Evidencia | null>(null)
  const [urlDocumento, setUrlDocumento] = useState<string | undefined>()
  const [observacionHistorial, setObservacionHistorial] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [indicador, setIndicador] = useState('')
  const [archivoNuevo, setArchivoNuevo] = useState<File | null>(null)
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [confirmarReenvio, setConfirmarReenvio] = useState(false)

  async function refrescarDocumento(id: string) {
    if (!apiDisponible()) return
    const descarga = await obtenerUrlDescargaApi(id).catch(() => null)
    if (descarga?.url) setUrlDocumento(descarga.url)
  }

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      try {
        if (apiDisponible()) {
          const [ev, descarga, historial] = await Promise.all([
            obtenerEvidenciaApi(params.id),
            obtenerUrlDescargaApi(params.id).catch(() => null),
            obtenerHistorialApi(params.id).catch(() => []),
          ])
          const mapeada: Evidencia = {
            ...ev,
            fechaCarga:
              typeof ev.fechaCarga === 'string'
                ? ev.fechaCarga.slice(0, 10)
                : new Date().toISOString().slice(0, 10),
          }
          setEvidencia(mapeada)
          setNombre(mapeada.nombre)
          setIndicador(mapeada.indicador)
          if (descarga?.url) setUrlDocumento(descarga.url)

          const ultimoRechazo = historial
            .filter((h) => h.estado === 'Rechazado' && h.observacion)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
          if (ultimoRechazo?.observacion) {
            setObservacionHistorial(ultimoRechazo.observacion)
          }
        } else {
          const local = datos.evidencias.find((e) => e.id === params.id) ?? null
          setEvidencia(local)
          if (local) {
            setNombre(local.nombre)
            setIndicador(local.indicador)
          }
        }
      } catch {
        const local = datos.evidencias.find((e) => e.id === params.id) ?? null
        setEvidencia(local)
        if (local) {
          setNombre(local.nombre)
          setIndicador(local.indicador)
        }
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [params.id, datos.evidencias])

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando evidencia…</p>
  }

  if (!evidencia) {
    return (
      <>
        <EncabezadoPagina
          etiqueta="Gestión documental"
          titulo="Evidencia no encontrada"
          descripcion="La evidencia solicitada no existe."
        />
        <Link href="/cargador/evidencias">
          <Button variant="outline">Volver al listado</Button>
        </Link>
      </>
    )
  }

  const esRechazada = evidencia.estado === 'Rechazado'
  const puedeReenviar = evidencia.estado === 'Rechazado' || evidencia.estado === 'Borrador'
  const extension = evidencia.nombreArchivo.split('.').pop()?.toLowerCase()
  const formato = extension === 'xlsx' ? 'XLSX' : 'PDF'
  const observacionesTexto = evidencia.observaciones ?? observacionHistorial
  const versionActual = evidencia.version ?? 1

  async function guardarMetadatos() {
    setProcesando(true)
    try {
      if (apiDisponible()) {
        await actualizarEvidenciaApi(params.id, {
          nombre: nombre.trim(),
          indicador: indicador.trim(),
        })
      }
      actualizarEvidencia(params.id, { nombre: nombre.trim(), indicador: indicador.trim() })
      setEvidencia((prev) =>
        prev ? { ...prev, nombre: nombre.trim(), indicador: indicador.trim() } : prev,
      )
      toast.success('Metadatos actualizados.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron guardar los cambios.')
    } finally {
      setProcesando(false)
    }
  }

  async function subirNuevaVersion() {
    if (!archivoNuevo) {
      toast.error('Selecciona un archivo para la nueva versión.')
      return
    }
    setProcesando(true)
    try {
      if (apiDisponible()) {
        const actualizada = await subirVersionArchivoApi(params.id, archivoNuevo)
        setEvidencia((prev) =>
          prev
            ? {
                ...prev,
                version: actualizada.version ?? versionActual + 1,
                nombreArchivo: actualizada.nombreArchivo,
              }
            : prev,
        )
        await refrescarDocumento(params.id)
      } else {
        setEvidencia((prev) =>
          prev
            ? {
                ...prev,
                version: versionActual + 1,
                nombreArchivo: archivoNuevo.name,
              }
            : prev,
        )
      }
      actualizarEvidencia(params.id, {
        version: versionActual + 1,
        nombreArchivo: archivoNuevo.name,
      })
      setArchivoNuevo(null)
      toast.success(`Versión ${versionActual + 1} cargada correctamente.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la nueva versión.')
    } finally {
      setProcesando(false)
    }
  }

  async function reenviarRevision() {
    setProcesando(true)
    try {
      if (apiDisponible()) {
        const actualizada = await enviarRevisionApi(params.id)
        setEvidencia((prev) => (prev ? { ...prev, estado: actualizada.estado } : prev))
      }
      actualizarEvidencia(params.id, { estado: 'EnRevision', observaciones: undefined })
      toast.success('Evidencia enviada a revisión.')
      router.push('/cargador/evidencias')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo reenviar la evidencia.')
    } finally {
      setProcesando(false)
      setConfirmarReenvio(false)
    }
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Gestión documental"
        titulo={evidencia.nombre}
        descripcion="Consulta el documento, carga versiones corregidas y reenvía a revisión si aplica."
        accion={
          <Link href="/cargador/evidencias">
            <Button variant="outline">Volver al listado</Button>
          </Link>
        }
      />

      {esRechazada && observacionesTexto && (
        <div className="rounded-xl border border-fucsia/30 bg-fucsia/5 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="destructive">Con observaciones</Badge>
            <Badge variant="secondary">Versión {versionActual}</Badge>
            <InsigniaEstado estado={evidencia.estado} />
          </div>
          <p className="text-sm font-medium text-primary">Observaciones del revisor</p>
          <p className="mt-1 text-sm text-muted-foreground">{observacionesTexto}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <VisorDocumentoInline
              titulo={evidencia.nombreArchivo}
              urlDocumento={urlDocumento}
              formato={formato}
              claveCache={versionActual}
            />
            <div className="grid gap-3 text-sm md:grid-cols-2">
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
                <p className="text-xs uppercase text-muted-foreground">Versión</p>
                <p>v{versionActual}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Fecha de carga</p>
                <p>{formatearFecha(evidencia.fechaCarga)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <InsigniaEstado estado={evidencia.estado} />
              <Badge variant="outline">Versión {versionActual}</Badge>
            </div>

            {puedeReenviar && (
              <>
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Nombre del documento</span>
                  <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </label>
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Indicador</span>
                  <Input value={indicador} onChange={(e) => setIndicador(e.target.value)} />
                </label>

                <div className="rounded-lg border border-dashed border-primary/20 bg-accent/30 p-4">
                  <p className="text-sm font-medium text-primary">
                    Cargar versión {versionActual + 1} corregida
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sube el documento corregido antes de reenviar a revisión.
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(e) => setArchivoNuevo(e.target.files?.[0] ?? null)}
                    className="mt-3 w-full text-sm"
                  />
                  <Button
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={subirNuevaVersion}
                    disabled={procesando || !archivoNuevo}
                  >
                    Subir versión {versionActual + 1}
                  </Button>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={guardarMetadatos}
                  disabled={procesando}
                >
                  Guardar cambios
                </Button>
                <Button
                  className="w-full"
                  onClick={() => setConfirmarReenvio(true)}
                  disabled={procesando}
                >
                  Enviar a revisión
                </Button>
              </>
            )}

            {!puedeReenviar && (
              <p className="text-sm text-muted-foreground">
                Esta evidencia está en estado {evidencia.estado} y no puede editarse desde aquí.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <HistorialVersionesEvidencia
        evidenciaId={params.id}
        versionActiva={versionActual}
      />

      <DialogoConfirmacion
        abierto={confirmarReenvio}
        titulo="Enviar a revisión?"
        descripcion="La evidencia pasará a estado En revisión y el revisor podrá dictaminarla nuevamente."
        etiquetaConfirmar="Sí, reenviar"
        variant="default"
        cargando={procesando}
        onConfirmar={reenviarRevision}
        onCancelar={() => setConfirmarReenvio(false)}
      />
    </div>
  )
}
