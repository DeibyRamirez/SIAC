'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import {
  ChecklistCondicionesDocumentoMaestro,
  crearEstadosCondicionIniciales,
  type EstadoCondicionDictamen,
} from '@/components/siac/checklist-condiciones-documento-maestro'
import { DialogoConfirmacion } from '@/components/siac/dialogo-confirmacion'
import { HistorialVersionesEvidencia } from '@/components/siac/historial-versiones-evidencia'
import { InsigniaEstado } from '@/components/siac/insignia-estado'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { VisorDocumentoInline } from '@/components/siac/visor-documento-inline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  CODIGOS_CONDICION_DOCUMENTO_MAESTRO,
  calcularPorcentajeCondiciones,
} from '@/lib/condiciones-documento-maestro'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  dictaminarEvidenciaApi,
  obtenerEvidenciaApi,
  obtenerUrlDescargaApi,
} from '@/lib/servicios/evidencias.servicio'
import type { Evidencia } from '@/lib/tipos'
import { formatearFecha, obtenerNombrePrograma } from '@/lib/utilidades-siac'

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
  const { dictaminarEvidencia } = usarAlmacen()
  const [evidencia, setEvidencia] = useState<Evidencia | null>(null)
  const [urlDocumento, setUrlDocumento] = useState<string | undefined>()
  const [cargando, setCargando] = useState(true)
  const [condiciones, setCondiciones] = useState<EstadoCondicionDictamen[]>(
    crearEstadosCondicionIniciales(),
  )
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [confirmarAprobar, setConfirmarAprobar] = useState(false)
  const [confirmarCorreccion, setConfirmarCorreccion] = useState(false)
  const [observacionesGenerales, setObservacionesGenerales] = useState('')

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      try {
        if (apiDisponible()) {
          const ev = await obtenerEvidenciaApi(params.id)
          const descarga = await obtenerUrlDescargaApi(params.id).catch(() => null)
          setEvidencia({
            ...ev,
            fechaCarga:
              typeof ev.fechaCarga === 'string'
                ? ev.fechaCarga.slice(0, 10)
                : new Date().toISOString().slice(0, 10),
          })
          if (descarga?.url) setUrlDocumento(descarga.url)
        }
      } catch (err) {
        setMensaje(err instanceof Error ? err.message : 'No se pudo cargar la evidencia.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [params.id])

  const usaChecklist = useMemo(() => {
    if (!evidencia) return false
    return (
      evidencia.requiereChecklistMaestro ||
      /documento\s*maestro/i.test(evidencia.nombre)
    )
  }, [evidencia])

  const porcentajePreview = useMemo(() => {
    const cumplidas = condiciones.filter((c) => c.cumple).length
    return calcularPorcentajeCondiciones(cumplidas)
  }, [condiciones])

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando evidencia…</p>
  }

  if (!evidencia) {
    return (
      <>
        <EncabezadoPagina
          etiqueta="Flujo de aprobación"
          titulo="Evidencia no encontrada"
          descripcion="La evidencia solicitada no existe o ya fue dictaminada."
        />
        <Link href="/revisor/bandeja">
          <Button variant="outline">Volver a la bandeja</Button>
        </Link>
      </>
    )
  }

  const puedeDictaminar = evidencia.estado === 'EnRevision'
  const versionActual = evidencia.version ?? 1
  const todasCumplen = condiciones.every((c) => c.cumple)

  function validarCondiciones(): string | null {
    if (condiciones.length !== CODIGOS_CONDICION_DOCUMENTO_MAESTRO.length) {
      return 'Debe evaluar las 9 condiciones.'
    }
    for (const c of condiciones) {
      if (!c.cumple && !c.observacion.trim()) {
        return 'Registra observaciones en cada condición que no cumple.'
      }
    }
    return null
  }

  async function enviarDictamen(aprobacionTotal: boolean) {
    if (!evidencia) return
    if (!puedeDictaminar) {
      setMensaje('Solo se puede dictaminar evidencias en estado En revisión.')
      return
    }

    const payloadCondiciones = condiciones.map((c) => ({
      codigo: c.codigo,
      cumple: c.cumple,
      observacion: c.observacion.trim() || undefined,
    }))

    if (usaChecklist) {
      const errorValidacion = validarCondiciones()
      if (errorValidacion && !aprobacionTotal) {
        setMensaje(errorValidacion)
        return
      }
      if (aprobacionTotal && !todasCumplen) {
        setMensaje('Para aprobar deben cumplirse las 9 condiciones.')
        return
      }
    }

    const estado = aprobacionTotal ? 'Validado' : 'Rechazado'
    const observaciones = usaChecklist
      ? payloadCondiciones
          .filter((c) => !c.cumple && c.observacion)
          .map((c) => c.observacion)
          .join('\n')
      : observacionesGenerales.trim()

    if (!usaChecklist && !aprobacionTotal && !observaciones) {
      setMensaje('Debes registrar observaciones para enviar a corrección.')
      return
    }

    setProcesando(true)
    try {
      if (apiDisponible()) {
        await dictaminarEvidenciaApi(evidencia.id, {
          condiciones: usaChecklist ? payloadCondiciones : undefined,
          estado: usaChecklist ? undefined : estado,
          observaciones: usaChecklist ? undefined : observaciones,
        })
      }
      await dictaminarEvidencia(
        evidencia.id,
        estado,
        observaciones,
        usaChecklist ? payloadCondiciones : undefined,
        usaChecklist ? porcentajePreview : aprobacionTotal ? 100 : undefined,
      )
      router.push('/revisor/bandeja')
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : 'No se pudo registrar el dictamen.')
    } finally {
      setProcesando(false)
      setConfirmarAprobar(false)
      setConfirmarCorreccion(false)
    }
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Flujo de aprobación"
        titulo={evidencia.nombre}
        descripcion="Visualiza el documento y evalúa las condiciones del Documento Maestro cuando aplique."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="space-y-4 pt-6 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Versión {versionActual}</Badge>
              <InsigniaEstado estado={evidencia.estado} />
              {evidencia.porcentajeCompletitud !== undefined &&
                evidencia.porcentajeCompletitud > 0 && (
                  <Badge variant="outline">
                    Avance documento: {evidencia.porcentajeCompletitud}%
                  </Badge>
                )}
            </div>
            <VisorDocumentoInline
              titulo={evidencia.nombreArchivo}
              urlDocumento={urlDocumento}
              formato="DOCX"
              claveCache={versionActual}
              evidenciaId={evidencia.id}
              versionDocumento={versionActual}
            />
            <div className="grid gap-3 md:grid-cols-2">
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

        <Card>
          <CardContent className="space-y-4 pt-6">
            {!puedeDictaminar && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Esta evidencia no está en revisión. Estado actual: {evidencia.estado}.
              </p>
            )}

            {usaChecklist ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-primary">
                    Checklist — 9 condiciones
                  </p>
                  <span className="text-sm font-medium text-esmeralda">
                    {porcentajePreview}%
                  </span>
                </div>
                <ChecklistCondicionesDocumentoMaestro
                  estados={condiciones}
                  onChange={setCondiciones}
                  deshabilitado={!puedeDictaminar}
                />
              </>
            ) : (
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Observaciones</span>
                <Textarea
                  value={observacionesGenerales}
                  onChange={(e) => setObservacionesGenerales(e.target.value)}
                  placeholder="Observaciones si envías a corrección."
                  disabled={!puedeDictaminar}
                />
              </label>
            )}

            {mensaje && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {mensaje}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => setConfirmarAprobar(true)}
                disabled={!puedeDictaminar || procesando || (usaChecklist && !todasCumplen)}
              >
                Aprobar documento
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (usaChecklist) {
                    const err = validarCondiciones()
                    if (err && condiciones.every((c) => c.cumple)) {
                      setMensaje('Marque al menos una condición pendiente o apruebe el documento.')
                      return
                    }
                    if (err) {
                      setMensaje(err)
                      return
                    }
                  }
                  setConfirmarCorreccion(true)
                }}
                disabled={!puedeDictaminar || procesando}
              >
                Enviar a corrección
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
        titulo="¿Aprobar documento?"
        descripcion="Las 9 condiciones deben estar cumplidas. El cargador será notificado."
        etiquetaConfirmar="Sí, aprobar"
        cargando={procesando}
        onConfirmar={() => enviarDictamen(true)}
        onCancelar={() => setConfirmarAprobar(false)}
      />
      <DialogoConfirmacion
        abierto={confirmarCorreccion}
        titulo="¿Enviar a corrección?"
        descripcion={`El cargador verá el avance parcial (${porcentajePreview}%) y las observaciones por condición.`}
        etiquetaConfirmar="Sí, enviar"
        variant="destructive"
        cargando={procesando}
        onConfirmar={() => enviarDictamen(false)}
        onCancelar={() => setConfirmarCorreccion(false)}
      />
    </div>
  )
}
