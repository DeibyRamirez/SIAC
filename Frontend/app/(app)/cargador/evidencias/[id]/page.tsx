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
import { ResumenObservacionesPorCondicion } from '@/components/siac/resumen-observaciones-por-condicion'
import { VisorDocumentoInline } from '@/components/siac/visor-documento-inline'
import { ZonaCargaDocx } from '@/components/siac/zona-carga-docx'
import type { EvaluacionCondicionEvidencia } from '@/lib/condiciones-documento-maestro'
import {
  etiquetaCondicionInstitucional,
  type EvaluacionCondicionInstitucionalEvidencia,
} from '@/lib/condiciones-institucionales'
import { ETIQUETAS_GUIA } from '@/lib/utilidades/catalogo-tramites-siac'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  enviarRevisionApi,
  listarVersionesApi,
  obtenerComentariosEvidenciaApi,
  obtenerEvidenciaApi,
  obtenerHistorialApi,
  obtenerUrlDescargaApi,
  subirVersionArchivoApi,
  obtenerEvaluacionesCondicionApi,
  type ComentarioEvidenciaApi,
  obtenerEvaluacionesCondicionInstitucionalApi,
} from '@/lib/servicios/evidencias.servicio'
import type { Evidencia } from '@/lib/tipos'
import { inspeccionarFirmaDocx } from '@/lib/utilidades/leer-firma-docx'
import {
  admiteCorreccion,
  formatoVisorDesdeArchivo,
  formatearFecha,
  obtenerNombrePrograma,
} from '@/lib/utilidades-siac'
import { cn } from '@/lib/utils'

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
  const [archivoNuevo, setArchivoNuevo] = useState<File | null>(null)
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [confirmarReenvio, setConfirmarReenvio] = useState(false)
  const [firmaEsperada, setFirmaEsperada] = useState<string | null>(null)
  const [estadoVerificacion, setEstadoVerificacion] = useState<
    'inactivo' | 'verificando' | 'valido' | 'invalido'
  >('inactivo')
  const [mensajeVerificacion, setMensajeVerificacion] = useState<string | null>(null)
  const [evaluacionesCondicion, setEvaluacionesCondicion] = useState<
    EvaluacionCondicionEvidencia[]
  >([])
  const [comentariosRevisor, setComentariosRevisor] = useState<
    ComentarioEvidenciaApi[]
  >([])
  const [anclaResaltada, setAnclaResaltada] = useState<{
    anchor?: string
    quote?: string
    nonce: number
  } | null>(null)
  const [comentarioActivoId, setComentarioActivoId] = useState<string | null>(null)
  const [evaluacionesInstitucionales, setEvaluacionesInstitucionales] = useState<
    EvaluacionCondicionInstitucionalEvidencia[]
  >([])

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
          const [ev, descarga, historial, evaluaciones, versiones, evaluacionesCi] =
            await Promise.all([
            obtenerEvidenciaApi(params.id),
            obtenerUrlDescargaApi(params.id).catch(() => null),
            obtenerHistorialApi(params.id).catch(() => []),
            obtenerEvaluacionesCondicionApi(params.id).catch(() => []),
            listarVersionesApi(params.id).catch(() => []),
            obtenerEvaluacionesCondicionInstitucionalApi(params.id).catch(
              () => [],
            ),
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
          if (descarga?.url) setUrlDocumento(descarga.url)

          const firmaActiva =
            versiones.find((v) => v.numero === (mapeada.version ?? 1))?.firmaDescarga ??
            versiones[0]?.firmaDescarga ??
            null
          setFirmaEsperada(firmaActiva ?? null)

          const ultimoRechazo = historial
            .filter(
              (h) =>
                (h.estado === 'ConObservaciones' || h.estado === 'Rechazado') && h.observacion,
            )
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
          if (ultimoRechazo?.observacion) {
            setObservacionHistorial(ultimoRechazo.observacion)
          }
          setEvaluacionesCondicion(
            evaluaciones.map((e) => ({
              codigoCondicion: e.codigoCondicion,
              cumple: e.cumple,
              observacion: e.observacion,
            })),
          )

          const comentarios = await obtenerComentariosEvidenciaApi(
            params.id,
            mapeada.version ?? 1,
          ).catch(() => [])
          setComentariosRevisor(comentarios)
          setEvaluacionesInstitucionales(
            evaluacionesCi.map((e) => ({
              codigoCondicion: e.codigoCondicion,
              cumple: e.cumple,
              observacion: e.observacion,
            })),
          )
        } else {
          const local = datos.evidencias.find((e) => e.id === params.id) ?? null
          setEvidencia(local)
          if (local) setNombre(local.nombre)
        }
      } catch {
        const local = datos.evidencias.find((e) => e.id === params.id) ?? null
        setEvidencia(local)
        if (local) setNombre(local.nombre)
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

  // Con observaciones (checklist n < total) o Rechazado (decisión explícita): requiere corrección.
  const esRechazada =
    evidencia.estado === 'ConObservaciones' || evidencia.estado === 'Rechazado'
  const puedeReenviar = admiteCorreccion(evidencia.estado)
  const formato = formatoVisorDesdeArchivo(evidencia.nombreArchivo)
  const observacionesTexto = evidencia.observaciones ?? observacionHistorial
  const versionActual = evidencia.version ?? 1

  async function manejarArchivoCorregido(file: File | null) {
    setArchivoNuevo(file)
    setMensajeVerificacion(null)

    if (!file) {
      setEstadoVerificacion('inactivo')
      return
    }

    if (!file.name.toLowerCase().endsWith('.docx')) {
      const mensaje = 'Solo se permiten documentos Word (.docx).'
      setEstadoVerificacion('invalido')
      setMensajeVerificacion(mensaje)
      setArchivoNuevo(null)
      toast.error(mensaje)
      return
    }

    setEstadoVerificacion('verificando')
    const { esDocxValido, firma } = await inspeccionarFirmaDocx(file)

    if (!esDocxValido) {
      const mensaje = 'El archivo no es un .docx válido.'
      setEstadoVerificacion('invalido')
      setMensajeVerificacion(mensaje)
      setArchivoNuevo(null)
      toast.error(mensaje)
      return
    }

    let firmaVigente = firmaEsperada
    if (apiDisponible()) {
      const versiones = await listarVersionesApi(params.id).catch(() => null)
      if (versiones) {
        const vigente =
          versiones.find((v) => v.numero === versionActual) ?? versiones[0]
        firmaVigente = vigente?.firmaDescarga ?? null
        setFirmaEsperada(firmaVigente)
      }
    }

    if (firmaVigente && !firma) {
      const mensaje =
        'Falta la firma de versión SIAC; descarga el documento desde SIAC y vuelve a subirlo.'
      setEstadoVerificacion('invalido')
      setMensajeVerificacion(mensaje)
      setArchivoNuevo(null)
      toast.error(mensaje)
      return
    }

    if (firmaVigente && firma && firma !== firmaVigente) {
      const mensaje =
        'La firma no coincide con la última descarga de esta evidencia. Descarga la última versión, corrige sobre ese archivo y vuelve a subirlo.'
      setEstadoVerificacion('invalido')
      setMensajeVerificacion(mensaje)
      setArchivoNuevo(null)
      toast.error(mensaje)
      return
    }

    setEstadoVerificacion('valido')
    const mensaje = firmaVigente
      ? 'Documento correcto: firma de la última descarga verificada.'
      : 'Documento cargado correctamente.'
    setMensajeVerificacion(mensaje)
    toast.success(mensaje)
  }

  async function enviarARevision() {
    if (!evidencia) return
    if (esRechazada && !archivoNuevo) {
      toast.error('Debe cargar el documento .docx corregido antes de enviar a revisión.')
      return
    }
    if (archivoNuevo && estadoVerificacion !== 'valido') {
      toast.error(
        'El documento seleccionado no es válido. Descargue la última versión y corrija sobre ese archivo.',
      )
      return
    }

    setProcesando(true)
    try {
      if (apiDisponible()) {
        if (archivoNuevo) {
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
        }
        const actualizada = await enviarRevisionApi(params.id)
        setEvidencia((prev) => (prev ? { ...prev, estado: actualizada.estado } : prev))
      }
      actualizarEvidencia(params.id, {
        estado: 'EnRevision',
        observaciones: undefined,
        ...(archivoNuevo
          ? {
              version: versionActual + 1,
              nombreArchivo: archivoNuevo.name,
            }
          : {}),
      })
      toast.success('Evidencia enviada a revisión.')
      router.push('/cargador/evidencias')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar la evidencia a revisión.')
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

      {esRechazada && evaluacionesCondicion.length > 0 && (
        <ResumenObservacionesPorCondicion
          evaluaciones={evaluacionesCondicion}
          puntaje={evidencia.puntajeActual}
          totalCondiciones={evidencia.totalCondicionesActual}
          titulo="Evaluación G1 — condiciones de programa"
        />
      )}

      {esRechazada && comentariosRevisor.length > 0 && (
        <div className="rounded-xl border border-fucsia/30 bg-fucsia/5 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="destructive">Comentarios del revisor</Badge>
            <Badge variant="secondary">Versión {versionActual}</Badge>
            <InsigniaEstado estado={evidencia.estado} />
          </div>
          <p className="text-xs text-muted-foreground">
            Al descargar el documento, estos comentarios se abren anclados al texto
            en Word/Google Docs. Pulsa uno para resaltar la cita en el visor.
          </p>
          <ul className="mt-3 space-y-2">
            {comentariosRevisor.map((comentario, indice) => {
              const idComentario = `${comentario.anchor ?? comentario.hunkId ?? 'c'}-${indice}`
              const activo = comentarioActivoId === idComentario
              return (
                <li key={idComentario}>
                  <button
                    type="button"
                    aria-pressed={activo}
                    className={cn(
                      'w-full rounded-lg border bg-white p-3 text-left transition-colors',
                      activo
                        ? 'border-fucsia ring-2 ring-fucsia/30'
                        : 'border-fucsia/20 hover:border-fucsia/50',
                    )}
                    onClick={() => {
                      if (activo) {
                        setComentarioActivoId(null)
                        setAnclaResaltada(null)
                        return
                      }
                      setComentarioActivoId(idComentario)
                      setAnclaResaltada({
                        anchor: comentario.anchor,
                        quote: comentario.quote,
                        nonce: Date.now(),
                      })
                    }}
                  >
                    {comentario.quote && (
                      <p className="mb-1 border-l-2 border-emerald-400 pl-2 text-xs italic text-muted-foreground">
                        «{comentario.quote}»
                      </p>
                    )}
                    <p className="whitespace-pre-line text-sm">{comentario.texto}</p>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {esRechazada && evaluacionesInstitucionales.length > 0 && (
        <ResumenObservacionesPorCondicion
          evaluaciones={evaluacionesInstitucionales.map((e) => ({
            codigoCondicion: e.codigoCondicion as EvaluacionCondicionEvidencia['codigoCondicion'],
            cumple: e.cumple,
            observacion: e.observacion,
          }))}
          puntaje={evidencia.puntajeActual}
          totalCondiciones={evidencia.totalCondicionesActual}
          titulo="Evaluación G3 — condiciones institucionales"
          resolverEtiqueta={(codigo) =>
            etiquetaCondicionInstitucional(
              codigo as EvaluacionCondicionInstitucionalEvidencia['codigoCondicion'],
            )
          }
        />
      )}

      {esRechazada &&
        observacionesTexto &&
        evaluacionesCondicion.length === 0 &&
        evaluacionesInstitucionales.length === 0 &&
        comentariosRevisor.length === 0 && (
        <div className="rounded-xl border border-fucsia/30 bg-fucsia/5 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="destructive">Con observaciones</Badge>
            <Badge variant="secondary">Versión {versionActual}</Badge>
            <InsigniaEstado estado={evidencia.estado} />
          </div>
          <p className="text-sm font-medium text-primary">Observaciones del revisor</p>
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
            {observacionesTexto}
          </p>
        </div>
      )}

      {esRechazada &&
        comentariosRevisor.length === 0 &&
        observacionesTexto &&
        evaluacionesCondicion.length === 0 && (
          <div className="rounded-xl border border-fucsia/30 bg-fucsia/5 p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="destructive">Con observaciones</Badge>
              <Badge variant="secondary">Versión {versionActual}</Badge>
              <InsigniaEstado estado={evidencia.estado} />
            </div>
            <p className="text-sm font-medium text-primary">Observaciones del revisor</p>
            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
              {observacionesTexto}
            </p>
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
              evidenciaId={evidencia.id}
              versionDocumento={versionActual}
              anclaResaltada={anclaResaltada ?? undefined}
            />
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Programa</p>
                <p>{obtenerNombrePrograma(evidencia.programaId, datos.programas)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Periodo</p>
                <p>{evidencia.periodo}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Guía</p>
                <p>
                  {evidencia.codigoGuia
                    ? `${evidencia.codigoGuia} — ${ETIQUETAS_GUIA[evidencia.codigoGuia]}`
                    : 'Sin guía'}
                </p>
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
                  <Input value={nombre} readOnly className="bg-muted" />
                </label>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-primary">
                    {esRechazada
                      ? `Documento corregido (versión ${versionActual + 1})`
                      : 'Actualizar documento (opcional)'}
                  </p>
                  <ZonaCargaDocx
                    archivo={archivoNuevo}
                    onArchivoSeleccionado={manejarArchivoCorregido}
                    deshabilitado={procesando || estadoVerificacion === 'verificando'}
                  />
                  {estadoVerificacion === 'verificando' && (
                    <p className="text-xs text-muted-foreground">
                      Verificando que sea el documento de la última versión…
                    </p>
                  )}
                  {mensajeVerificacion && (
                    <p
                      className={cn(
                        'rounded-lg px-3 py-2 text-xs',
                        estadoVerificacion === 'valido'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700',
                      )}
                    >
                      {mensajeVerificacion}
                    </p>
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={() => setConfirmarReenvio(true)}
                  disabled={
                    procesando ||
                    estadoVerificacion === 'verificando' ||
                    (!!archivoNuevo && estadoVerificacion === 'invalido') ||
                    (esRechazada && !archivoNuevo)
                  }
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
        titulo="¿Enviar a revisión?"
        descripcion="La evidencia pasará a estado En revisión. Si seleccionó un archivo, se cargará como nueva versión antes del envío."
        etiquetaConfirmar="Sí, enviar"
        variant="default"
        cargando={procesando}
        onConfirmar={enviarARevision}
        onCancelar={() => setConfirmarReenvio(false)}
      />
    </div>
  )
}
