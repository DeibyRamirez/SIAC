'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

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
import { Textarea } from '@/components/ui/textarea'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  dictaminarEvidenciaApi,
  obtenerEvidenciaApi,
  obtenerUrlDescargaApi,
} from '@/lib/servicios/evidencias.servicio'
import type { Evidencia } from '@/lib/tipos'
import { formatearFecha, obtenerNombrePrograma } from '@/lib/utilidades-siac'

function normalizarFechaCarga(fecha: string | Date): string {
  if (typeof fecha === 'string') return fecha.slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

export default function DictamenPage() {
  return (
    <PlantillaPaginaApp titulo="Dictamen de evidencia" rol="Revisor">
      <ContenidoDictamen />
    </PlantillaPaginaApp>
  )
}

function ContenidoDictamen() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { dictaminarEvidencia, datos } = usarAlmacen()
  const evidenciasLocalesRef = useRef(datos.evidencias)
  evidenciasLocalesRef.current = datos.evidencias
  const [evidencia, setEvidencia] = useState<Evidencia | null>(null)
  const [urlDocumento, setUrlDocumento] = useState<string | undefined>()
  const [cargando, setCargando] = useState(true)
  const [observaciones, setObservaciones] = useState('')
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [confirmarAprobar, setConfirmarAprobar] = useState(false)
  const [confirmarRechazar, setConfirmarRechazar] = useState(false)

  useEffect(() => {
    let cancelado = false

    async function cargarEvidencia() {
      setCargando(true)
      setMensaje(null)

      try {
        if (apiDisponible()) {
          const ev = await obtenerEvidenciaApi(params.id)
          if (cancelado) return
          const descarga = await obtenerUrlDescargaApi(params.id).catch(() => null)
          if (cancelado) return
          setEvidencia({
            ...ev,
            fechaCarga: normalizarFechaCarga(ev.fechaCarga),
          })
          setUrlDocumento(descarga?.url)
          return
        }

        const local = evidenciasLocalesRef.current.find((e) => e.id === params.id) ?? null
        setEvidencia(local)
        setUrlDocumento(undefined)
      } catch (err) {
        if (cancelado) return
        const local = evidenciasLocalesRef.current.find((e) => e.id === params.id) ?? null
        if (local) {
          setEvidencia(local)
          setMensaje(
            'No se pudo sincronizar con el servidor. Mostrando datos locales; el dictamen requiere conexión.',
          )
        } else {
          setEvidencia(null)
          setMensaje(err instanceof Error ? err.message : 'No se pudo cargar la evidencia.')
        }
      } finally {
        if (!cancelado) {
          setCargando(false)
        }
      }
    }

    cargarEvidencia()
    return () => {
      cancelado = true
    }
  }, [params.id])

  const puedeDictaminar = evidencia?.estado === 'EnRevision'
  const extension = evidencia?.nombreArchivo.split('.').pop()?.toLowerCase()
  const formato = extension === 'xlsx' ? 'XLSX' : 'PDF'
  const versionActual = evidencia?.version ?? 1

  async function aprobar() {
    if (!evidencia || !puedeDictaminar) {
      setMensaje('Solo se puede dictaminar evidencias en estado En revisión.')
      return
    }
    setProcesando(true)
    try {
      if (apiDisponible()) {
        await dictaminarEvidenciaApi(evidencia.id, 'Validado')
      }
      await dictaminarEvidencia(evidencia.id, 'Validado')
      router.push('/revisor/bandeja')
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : 'No se pudo aprobar la evidencia.')
    } finally {
      setProcesando(false)
      setConfirmarAprobar(false)
    }
  }

  async function rechazar() {
    if (!evidencia || !puedeDictaminar) {
      setMensaje('Solo se puede dictaminar evidencias en estado En revisión.')
      return
    }
    if (!observaciones.trim()) {
      setMensaje('Debes registrar observaciones para rechazar la evidencia.')
      return
    }
    setProcesando(true)
    try {
      if (apiDisponible()) {
        await dictaminarEvidenciaApi(evidencia.id, 'Rechazado', observaciones.trim())
      }
      await dictaminarEvidencia(evidencia.id, 'Rechazado', observaciones.trim())
      router.push('/revisor/bandeja')
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : 'No se pudo rechazar la evidencia.')
    } finally {
      setProcesando(false)
      setConfirmarRechazar(false)
    }
  }

  if (cargando && !evidencia) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <EncabezadoPagina
          etiqueta="Flujo de aprobación"
          titulo="Dictamen de evidencia"
          descripcion="Cargando información de la evidencia…"
        />
        <div className="flex flex-1 items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Cargando evidencia…</p>
        </div>
      </div>
    )
  }

  if (!evidencia) {
    return (
      <div className="flex min-h-0 flex-1 flex-col space-y-4">
        <EncabezadoPagina
          etiqueta="Flujo de aprobación"
          titulo="Evidencia no encontrada"
          descripcion="La evidencia solicitada no existe o ya fue dictaminada."
        />
        {mensaje && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{mensaje}</p>
        )}
        <Link href="/revisor/bandeja">
          <Button variant="outline">Volver a la bandeja</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <EncabezadoPagina
        etiqueta="Flujo de aprobación"
        titulo={evidencia.nombre}
        descripcion="Visualiza la evidencia y emite tu dictamen con observaciones si es necesario."
      />

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
        <Card className="flex min-h-0 flex-col">
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 pt-6 text-sm">
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary">Versión {versionActual}</Badge>
              <InsigniaEstado estado={evidencia.estado} />
            </div>
            <VisorDocumentoInline
              className="min-h-[min(52vh,520px)] flex-1"
              titulo={evidencia.nombreArchivo}
              urlDocumento={urlDocumento}
              formato={formato}
              claveCache={versionActual}
            />
            <div className="grid shrink-0 gap-3 md:grid-cols-2">
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
                <p className="text-xs uppercase text-muted-foreground">Fecha de carga</p>
                <p>{formatearFecha(evidencia.fechaCarga)}</p>
              </div>
            </div>
            <HistorialVersionesEvidencia
              evidenciaId={evidencia.id}
              versionActiva={versionActual}
            />
          </CardContent>
        </Card>

        <Card className="flex h-fit flex-col lg:sticky lg:top-0">
          <CardContent className="space-y-4 pt-6">
            {!puedeDictaminar && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Esta evidencia no está en revisión. Estado actual: {evidencia.estado}.
              </p>
            )}
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Observaciones</span>
              <Textarea
                value={observaciones}
                onChange={(evento) => setObservaciones(evento.target.value)}
                placeholder="Registra observaciones si rechazas la evidencia."
                disabled={!puedeDictaminar}
              />
            </label>
            {mensaje && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{mensaje}</p>
            )}
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => setConfirmarAprobar(true)}
                disabled={!puedeDictaminar || procesando}
              >
                Aprobar evidencia
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!observaciones.trim()) {
                    setMensaje('Debes registrar observaciones para rechazar la evidencia.')
                    return
                  }
                  setConfirmarRechazar(true)
                }}
                disabled={!puedeDictaminar || procesando}
              >
                Rechazar con observaciones
              </Button>
              <Link href="/revisor/bandeja">
                <Button variant="outline" className="w-full">
                  Volver
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <DialogoConfirmacion
        abierto={confirmarAprobar}
        titulo="¿Aprobar evidencia?"
        descripcion="La evidencia pasará a estado Validado y se notificará al cargador."
        etiquetaConfirmar="Sí, aprobar"
        cargando={procesando}
        onConfirmar={aprobar}
        onCancelar={() => setConfirmarAprobar(false)}
      />
      <DialogoConfirmacion
        abierto={confirmarRechazar}
        titulo="¿Rechazar evidencia?"
        descripcion="El cargador recibirá tus observaciones y podrá subir una versión corregida."
        etiquetaConfirmar="Sí, rechazar"
        variant="destructive"
        cargando={procesando}
        onConfirmar={rechazar}
        onCancelar={() => setConfirmarRechazar(false)}
      />
    </div>
  )
}
