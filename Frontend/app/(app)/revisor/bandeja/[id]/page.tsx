'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import {
  ChecklistCondicionesDocumentoMaestro,
  condicionCumpleParaApi,
  crearEstadosCondicionIniciales,
  type EstadoCondicionDictamen,
} from '@/components/siac/checklist-condiciones-documento-maestro'
import {
  ChecklistCondicionesInstitucionales,
  condicionInstitucionalCumpleParaApi,
  crearEstadosCondicionInstitucionalIniciales,
  type EstadoCondicionInstitucionalDictamen,
} from '@/components/siac/checklist-condiciones-institucionales'
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
  TOTAL_CONDICIONES_DOCUMENTO_MAESTRO,
} from '@/lib/condiciones-documento-maestro'
import {
  CODIGOS_CONDICION_INSTITUCIONAL,
  TOTAL_CONDICIONES_INSTITUCIONALES,
} from '@/lib/condiciones-institucionales'
import {
  DESCRIPCIONES_GUIA,
  ETIQUETAS_GUIA,
  guiaUsaChecklistInstitucional,
  guiaUsaChecklistPrograma,
} from '@/lib/utilidades/catalogo-tramites-siac'
import type { CodigoDocumentoGuia } from '@/lib/tipos'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  dictaminarEvidenciaApi,
  obtenerDiffVersionesApi,
  obtenerEvaluacionesCondicionApi,
  obtenerEvidenciaApi,
  obtenerUrlDescargaApi,
  type ComentarioInlinePayload,
  type DiffVersionesApi,
} from '@/lib/servicios/evidencias.servicio'
import type { Evidencia } from '@/lib/tipos'
import {
  limpiarBorradorRevision,
  usarBorradorRevisionDocx,
  type ComentarioInlineRevision,
} from '@/lib/hooks/usar-borrador-revision-docx'
import type { SeleccionDocx } from '@/lib/utilidades/seleccion-docx'
import {
  etiquetaEstadoEvidencia,
  formatearFecha,
  formatearPuntaje,
  obtenerNombrePrograma,
} from '@/lib/utilidades-siac'
import { cn } from '@/lib/utils'

export default function DictamenPage() {
  return (
    <PlantillaPaginaApp titulo="Dictamen de evidencia" rol="Revisor">
      <ContenidoDictamen />
    </PlantillaPaginaApp>
  )
}

interface EvaluacionPrevia {
  codigoCondicion: EstadoCondicionDictamen['codigo']
  cumple: boolean
  observacion?: string | null
}

function nuevoIdComentario(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `comentario-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Fusiona las condiciones con el último dictamen persistido (Documento Maestro).
 * Las condiciones previamente "Correcto" quedan marcadas; las "Corregir" quedan
 * pendientes de re-evaluar, conservando su observación previa como contexto.
 */
function fusionarCondiciones(
  base: EstadoCondicionDictamen[],
  previas: EvaluacionPrevia[],
): EstadoCondicionDictamen[] {
  if (previas.length === 0) return base
  const porCodigo = new Map(previas.map((e) => [e.codigoCondicion, e]))
  return base.map((item) => {
    const previa = porCodigo.get(item.codigo)
    if (!previa) return item
    const observacionPrevia = previa.observacion?.trim() || undefined
    if (previa.cumple) {
      return {
        ...item,
        decision: 'correcto',
        observacion: '',
        referenciaPrevia: observacionPrevia,
      }
    }
    return {
      ...item,
      decision: item.decision === 'correcto' ? null : item.decision,
      observacion: item.observacion || observacionPrevia || '',
      referenciaPrevia: observacionPrevia,
    }
  })
}

function ContenidoDictamen() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { sesion } = usarSesion()
  const { dictaminarEvidencia } = usarAlmacen()
  const [evidencia, setEvidencia] = useState<Evidencia | null>(null)
  const [urlDocumento, setUrlDocumento] = useState<string | undefined>()
  const [cargando, setCargando] = useState(true)
  const [condiciones, setCondiciones] = useState<EstadoCondicionDictamen[]>(
    crearEstadosCondicionIniciales(),
  )
  const [condicionesInstitucionales, setCondicionesInstitucionales] = useState<
    EstadoCondicionInstitucionalDictamen[]
  >(crearEstadosCondicionInstitucionalIniciales())
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [confirmarAprobar, setConfirmarAprobar] = useState(false)
  const [confirmarCorreccion, setConfirmarCorreccion] = useState(false)
  const [observacionesGenerales, setObservacionesGenerales] = useState('')
  const [comentariosInline, setComentariosInline] = useState<
    ComentarioInlineRevision[]
  >([])
  const [mostrarCambios, setMostrarCambios] = useState(false)
  const [diffVersiones, setDiffVersiones] = useState<DiffVersionesApi | null>(null)
  const [cargandoDiff, setCargandoDiff] = useState(false)
  const [errorDiff, setErrorDiff] = useState<string | null>(null)
  const [editandoComentarioId, setEditandoComentarioId] = useState<string | null>(
    null,
  )
  const [textoEdicionComentario, setTextoEdicionComentario] = useState('')
  const [anclaResaltada, setAnclaResaltada] = useState<{
    anchor: string
    nonce: number
  } | null>(null)
  const evaluacionesPreviasRef = useRef<
    Awaited<ReturnType<typeof obtenerEvaluacionesCondicionApi>>
  >([])

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      try {
        if (apiDisponible()) {
          const [ev, descarga, evaluaciones] = await Promise.all([
            obtenerEvidenciaApi(params.id),
            obtenerUrlDescargaApi(params.id).catch(() => null),
            obtenerEvaluacionesCondicionApi(params.id).catch(() => []),
          ])
          evaluacionesPreviasRef.current = evaluaciones
          setEvidencia({
            ...ev,
            fechaCarga:
              typeof ev.fechaCarga === 'string'
                ? ev.fechaCarga.slice(0, 10)
                : new Date().toISOString().slice(0, 10),
          })
          if (descarga?.url) setUrlDocumento(descarga.url)
          setCondiciones((prev) => fusionarCondiciones(prev, evaluaciones))
        }
      } catch (err) {
        setMensaje(err instanceof Error ? err.message : 'No se pudo cargar la evidencia.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [params.id])

  const guiaDocumento = useMemo((): CodigoDocumentoGuia | null => {
    if (!evidencia) return null
    if (evidencia.codigoGuia) return evidencia.codigoGuia
    if (
      evidencia.requiereChecklistMaestro ||
      /documento\s*maestro/i.test(evidencia.nombre)
    ) {
      return 'G1'
    }
    return null
  }, [evidencia])

  const usaChecklistPrograma = guiaDocumento
    ? guiaUsaChecklistPrograma(guiaDocumento)
    : false
  const usaChecklistInstitucional = guiaDocumento
    ? guiaUsaChecklistInstitucional(guiaDocumento)
    : false
  const usaChecklist = usaChecklistPrograma || usaChecklistInstitucional

  const versionActual = evidencia?.version ?? 1

  const restaurarBorrador = useCallback(
    (borrador: {
      condiciones: EstadoCondicionDictamen[]
      observacionesGenerales: string
      comentariosInline: ComentarioInlineRevision[]
    }) => {
      setCondiciones((prev) =>
        fusionarCondiciones(
          borrador.condiciones.length > 0 ? borrador.condiciones : prev,
          evaluacionesPreviasRef.current,
        ),
      )
      setObservacionesGenerales(borrador.observacionesGenerales)
      setComentariosInline(borrador.comentariosInline)
    },
    [],
  )

  usarBorradorRevisionDocx(
    params.id,
    versionActual,
    sesion?.usuarioId ?? null,
    condiciones,
    observacionesGenerales,
    comentariosInline,
    restaurarBorrador,
  )

  useEffect(() => {
    setDiffVersiones(null)
    setMostrarCambios(false)
    setErrorDiff(null)
  }, [params.id])

  useEffect(() => {
    if (!mostrarCambios || diffVersiones || versionActual < 2) return
    let cancelado = false
    setCargandoDiff(true)
    setErrorDiff(null)
    obtenerDiffVersionesApi(params.id, versionActual - 1, versionActual)
      .then((resultado) => {
        if (!cancelado) setDiffVersiones(resultado)
      })
      .catch((err) => {
        if (!cancelado) {
          setErrorDiff(
            err instanceof Error ? err.message : 'No se pudo comparar las versiones.',
          )
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoDiff(false)
      })
    return () => {
      cancelado = true
    }
  }, [mostrarCambios, diffVersiones, versionActual, params.id])


  // Regla n/9 (HU-003): puntaje entero = condiciones que cumplen (G3 usa n/6).
  const puntajePreview = useMemo(() => {
    if (usaChecklistInstitucional) {
      return {
        puntaje: condicionesInstitucionales.filter((c) => c.decision === 'correcto').length,
        total: TOTAL_CONDICIONES_INSTITUCIONALES,
      }
    }
    return {
      puntaje: condiciones.filter((c) => c.decision === 'correcto').length,
      total: TOTAL_CONDICIONES_DOCUMENTO_MAESTRO,
    }
  }, [condiciones, condicionesInstitucionales, usaChecklistInstitucional])
  const textoPuntajePreview = `${puntajePreview.puntaje}/${puntajePreview.total}`

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
  const todasCumplen = usaChecklistInstitucional
    ? condicionesInstitucionales.every((c) => c.decision === 'correcto')
    : condiciones.every((c) => c.decision === 'correcto')
  const observacionesBloqueanAprobar = usaChecklist
    ? usaChecklistInstitucional
      ? condicionesInstitucionales.some((c) => c.observacion.trim().length > 0)
      : condiciones.some((c) => c.observacion.trim().length > 0)
    : observacionesGenerales.trim().length > 0

  function validarCondiciones(): string | null {
    const lista = usaChecklistInstitucional
      ? condicionesInstitucionales
      : condiciones
    const totalEsperado = usaChecklistInstitucional
      ? CODIGOS_CONDICION_INSTITUCIONAL.length
      : CODIGOS_CONDICION_DOCUMENTO_MAESTRO.length
    if (lista.length !== totalEsperado) {
      return usaChecklistInstitucional
        ? 'Debe evaluar las 6 condiciones institucionales.'
        : 'Debe evaluar las 9 condiciones de programa.'
    }
    for (const c of lista) {
      if (c.decision === null) {
        return 'Marque Correcto o Corregir en cada condición.'
      }
      if (c.decision === 'corregir' && !c.observacion.trim()) {
        return 'Registra observaciones en cada condición marcada como Corregir.'
      }
    }
    return null
  }

  function agregarComentarioSeleccion(seleccion: SeleccionDocx) {
    const id = nuevoIdComentario()
    const ahora = new Date().toISOString()
    setComentariosInline((prev) => [
      ...prev,
      {
        id,
        anchor: seleccion.anchor,
        quote: seleccion.quote,
        body: '',
        createdAt: ahora,
        updatedAt: ahora,
      },
    ])
    setEditandoComentarioId(id)
    setTextoEdicionComentario('')
    setAnclaResaltada({ anchor: seleccion.anchor, nonce: Date.now() })
  }

  function eliminarComentario(id: string) {
    setComentariosInline((prev) => prev.filter((c) => c.id !== id))
    if (editandoComentarioId === id) {
      setEditandoComentarioId(null)
      setTextoEdicionComentario('')
    }
  }

  function confirmarEdicionComentario(id: string) {
    const texto = textoEdicionComentario.trim()
    if (!texto) {
      eliminarComentario(id)
      return
    }
    setComentariosInline((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, body: texto, updatedAt: new Date().toISOString() } : c,
      ),
    )
    setEditandoComentarioId(null)
    setTextoEdicionComentario('')
  }

  function cancelarEdicionComentario(id: string) {
    const comentario = comentariosInline.find((c) => c.id === id)
    if (comentario && !comentario.body.trim()) {
      eliminarComentario(id)
      return
    }
    setEditandoComentarioId(null)
    setTextoEdicionComentario('')
  }

  function resaltarComentario(comentario: ComentarioInlineRevision) {
    if (!comentario.anchor) return
    setAnclaResaltada({ anchor: comentario.anchor, nonce: Date.now() })
  }

  async function enviarDictamen(aprobacionTotal: boolean) {
    if (!evidencia) return
    if (!puedeDictaminar) {
      setMensaje('Solo se puede dictaminar evidencias pendientes de verificación.')
      return
    }

    const payloadCondiciones = condiciones.map((c) => ({
      codigo: c.codigo,
      cumple: condicionCumpleParaApi(c),
      observacion: c.observacion.trim() || undefined,
    }))
    const payloadCondicionesInstitucionales = condicionesInstitucionales.map(
      (c) => ({
        codigo: c.codigo,
        cumple: condicionInstitucionalCumpleParaApi(c),
        observacion: c.observacion.trim() || undefined,
      }),
    )

    if (usaChecklist) {
      const errorValidacion = validarCondiciones()
      if (errorValidacion && !aprobacionTotal) {
        setMensaje(errorValidacion)
        return
      }
      if (aprobacionTotal && !todasCumplen) {
        setMensaje(
          usaChecklistInstitucional
            ? 'Para aprobar deben cumplirse las 6 condiciones institucionales.'
            : 'Para aprobar deben cumplirse las 9 condiciones de programa.',
        )
        return
      }
    }

    // Con checklist el resultado sale del puntaje: Cumple (n = total) o Con observaciones.
    // Sin checklist (G2/G4) es la decisión explícita del Revisor: Validado o Rechazado.
    const estado = usaChecklist
      ? todasCumplen
        ? 'Cumple'
        : 'ConObservaciones'
      : aprobacionTotal
        ? 'Validado'
        : 'Rechazado'
    const estadoDecision = aprobacionTotal ? 'Validado' : 'Rechazado'
    const observaciones = usaChecklist
      ? (usaChecklistInstitucional
          ? payloadCondicionesInstitucionales
          : payloadCondiciones)
          .filter((c) => !c.cumple && c.observacion)
          .map((c) => c.observacion)
          .join('\n')
      : ''

    const comentariosPayload: ComentarioInlinePayload[] =
      !aprobacionTotal && !usaChecklist
        ? comentariosInline
            .filter((c) => c.body.trim())
            .map((c) => ({
              hunkId: c.hunkId,
              anchor: c.anchor,
              quote: c.quote,
              texto: c.body.trim(),
              createdAt: c.createdAt,
            }))
        : []

    if (!usaChecklist && !aprobacionTotal && comentariosPayload.length === 0) {
      setMensaje(
        'Selecciona texto en el documento y agrega al menos un comentario para enviar a corrección.',
      )
      return
    }

    const observacionesLocal = usaChecklist
      ? observaciones
      : comentariosPayload
          .map((c) => `• ${c.quote ? `«${c.quote}» — ` : ''}${c.texto}`)
          .join('\n')

    setProcesando(true)
    try {
      if (apiDisponible()) {
        await dictaminarEvidenciaApi(evidencia.id, {
          condiciones: usaChecklistPrograma ? payloadCondiciones : undefined,
          condicionesInstitucionales: usaChecklistInstitucional
            ? payloadCondicionesInstitucionales
            : undefined,
          estado: usaChecklist ? undefined : estadoDecision,
          observaciones: usaChecklist
            ? undefined
            : observacionesGenerales.trim() || observacionesLocal || undefined,
          comentariosInline:
            comentariosPayload.length > 0 ? comentariosPayload : undefined,
        })
      }
      await dictaminarEvidencia(
        evidencia.id,
        estado,
        observacionesLocal,
        usaChecklist ? payloadCondiciones : undefined,
        usaChecklist
          ? {
              puntajeActual: puntajePreview.puntaje,
              totalCondicionesActual: puntajePreview.total,
            }
          : undefined,
      )
      limpiarBorradorRevision(evidencia.id, versionActual, sesion?.usuarioId ?? null)
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
        descripcion={
          guiaDocumento
            ? `${guiaDocumento}: ${DESCRIPCIONES_GUIA[guiaDocumento]}`
            : 'Visualiza el documento y registra el dictamen.'
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="space-y-4 pt-6 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Versión {versionActual}</Badge>
              {guiaDocumento && (
                <Badge variant="outline">
                  {guiaDocumento}: {ETIQUETAS_GUIA[guiaDocumento]}
                </Badge>
              )}
              <InsigniaEstado estado={evidencia.estado} />

              {!usaChecklist && comentariosInline.length > 0 && (
                <Badge variant="outline">
                  {comentariosInline.length} comentario(s) inline
                </Badge>
              )}
              {formatearPuntaje(evidencia.puntajeActual, evidencia.totalCondicionesActual) && (
                <Badge variant="outline">
                  Última verificación:{' '}
                  {formatearPuntaje(evidencia.puntajeActual, evidencia.totalCondicionesActual)}
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
              modoCambios={
                versionActual >= 2
                  ? {
                      activo: mostrarCambios,
                      onToggle: () => setMostrarCambios((valor) => !valor),
                      etiquetaInactiva: `Ver cambios v${versionActual - 1} → v${versionActual}`,
                      etiquetaActiva: 'Ocultar cambios',
                      deshabilitado: !apiDisponible(),
                    }
                  : undefined
              }
              anotacionesCambios={diffVersiones?.lineas}
              pieCambios={
                cargandoDiff ? (
                  <p className="text-xs text-muted-foreground">
                    Comparando versiones…
                  </p>
                ) : errorDiff ? (
                  <p className="text-xs text-red-700">{errorDiff}</p>
                ) : diffVersiones ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                      +{diffVersiones.agregadas}
                    </span>
                    <span className="rounded bg-red-100 px-2 py-0.5 font-semibold text-red-700">
                      -{diffVersiones.eliminadas}
                    </span>
                    <span className="text-muted-foreground">
                      Marcas inline sobre el documento (rojo tachado / verde).
                    </span>
                    {diffVersiones.media
                      .filter((m) => m.estado !== 'sinCambios')
                      .map((m) => (
                        <span
                          key={m.part}
                          className={cn(
                            'rounded-full px-2 py-0.5 font-medium',
                            m.estado === 'agregado' &&
                              'bg-emerald-100 text-emerald-800',
                            m.estado === 'eliminado' && 'bg-red-100 text-red-700',
                            m.estado === 'modificado' &&
                              'bg-amber-100 text-amber-800',
                          )}
                          title={m.part}
                        >
                          {m.estado}: {m.part.split('/').pop()}
                        </span>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Sin cambios para mostrar.
                  </p>
                )
              }
              onComentarSeleccion={!usaChecklist ? agregarComentarioSeleccion : undefined}
              anclaResaltada={anclaResaltada ?? undefined}
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
                Esta evidencia no está pendiente de verificación. Estado actual:{' '}
                {etiquetaEstadoEvidencia(evidencia.estado)}.
              </p>
            )}

            {usaChecklistPrograma ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-primary">
                    Checklist G1 — 9 condiciones de programa
                  </p>
                  <span className="text-sm font-medium text-esmeralda">
                    {textoPuntajePreview}
                  </span>
                </div>
                <ChecklistCondicionesDocumentoMaestro
                  estados={condiciones}
                  onChange={setCondiciones}
                  deshabilitado={!puedeDictaminar}
                />
              </>
            ) : usaChecklistInstitucional ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-primary">
                    Checklist G3 — 6 condiciones institucionales
                  </p>
                  <span className="text-sm font-medium text-esmeralda">
                    {textoPuntajePreview}
                  </span>
                </div>
                <ChecklistCondicionesInstitucionales
                  estados={condicionesInstitucionales}
                  onChange={setCondicionesInstitucionales}
                  deshabilitado={!puedeDictaminar}
                />
              </>
            ) : (
              <>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-primary">
                    Comentarios en el documento
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {comentariosInline.length}
                  </span>
                </div>

                {comentariosInline.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                    Selecciona texto en el documento para comentar.
                  </p>
                ) : (
                  <ul className="max-h-[min(520px,60vh)] space-y-3 overflow-y-auto pr-1">
                    {comentariosInline.map((comentario) => (
                      <li
                        key={comentario.id}
                        className="rounded-lg border border-fucsia/25 bg-fucsia/5 p-3"
                      >
                        {editandoComentarioId === comentario.id ? (
                          <div className="space-y-2">
                            {comentario.quote && (
                              <p className="border-l-2 border-emerald-400 pl-2 text-xs italic text-muted-foreground">
                                «{comentario.quote}»
                              </p>
                            )}
                            <Textarea
                              className="min-h-[64px] text-sm"
                              placeholder="Escribe tu comentario…"
                              value={textoEdicionComentario}
                              autoFocus
                              onChange={(e) => setTextoEdicionComentario(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => confirmarEdicionComentario(comentario.id)}
                              >
                                Guardar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelarEdicionComentario(comentario.id)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="w-full text-left"
                              onClick={() => resaltarComentario(comentario)}
                            >
                              {comentario.quote && (
                                <p className="mb-1 border-l-2 border-emerald-400 pl-2 text-xs italic text-muted-foreground">
                                  «{comentario.quote}»
                                </p>
                              )}
                              <p className="whitespace-pre-line text-sm">
                                {comentario.body}
                              </p>
                              {comentario.hunkId && (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  Anclado a un cambio del diff
                                </p>
                              )}
                            </button>
                            <div className="mt-1 flex gap-2">
                              <button
                                type="button"
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                                onClick={() => {
                                  setEditandoComentarioId(comentario.id)
                                  setTextoEdicionComentario(comentario.body)
                                }}
                              >
                                <Pencil className="size-3" /> Editar
                              </button>
                              <button
                                type="button"
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => eliminarComentario(comentario.id)}
                              >
                                <Trash2 className="size-3" /> Eliminar
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <p className="text-xs text-muted-foreground">
                  Al enviar a corrección, estos comentarios se envían al cargador.
                </p>
              </div>

              <label className="block space-y-2 text-sm">
                <span className="font-medium">Observaciones</span>
                <Textarea
                  value={observacionesGenerales}
                  onChange={(e) => setObservacionesGenerales(e.target.value)}
                  placeholder="Observaciones si envías a corrección."
                  disabled={!puedeDictaminar}
                />
                <p className="text-xs text-muted-foreground">
                  {guiaDocumento === 'G2' || guiaDocumento === 'G4'
                    ? 'Documento de respaldo de mejoramiento: aprueba si cumple el artículo correspondiente o envía observaciones de corrección.'
                    : 'Para aprobar, el campo de observaciones debe estar vacío.'}
                </p>
              </label>
              </>
            )}

            {mensaje && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {mensaje}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => setConfirmarAprobar(true)}
                disabled={
                  !puedeDictaminar ||
                  procesando ||
                  (usaChecklist && !todasCumplen) ||
                  observacionesBloqueanAprobar
                }
              >
                {usaChecklist ? `Registrar «Cumple» (${textoPuntajePreview})` : 'Aprobar documento'}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (usaChecklist) {
                    const err = validarCondiciones()
                    const listaActual = usaChecklistInstitucional
                      ? condicionesInstitucionales
                      : condiciones
                    if (err && listaActual.every((c) => c.decision === 'correcto')) {
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
                disabled={
                  !puedeDictaminar ||
                  procesando ||
                  (!usaChecklist &&
                    comentariosInline.filter((c) => c.body.trim()).length === 0)
                }
              >
                {usaChecklist ? 'Registrar «Con observaciones»' : 'Enviar a corrección'}
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
        titulo={usaChecklist ? '¿Registrar el documento como «Cumple»?' : '¿Aprobar documento?'}
        descripcion={
          usaChecklistInstitucional
            ? 'Las 6 condiciones institucionales cumplen (6/6). El documento quedará en «Cumple» y el cargador será notificado.'
            : usaChecklistPrograma
              ? 'Las 9 condiciones de programa cumplen (9/9). El documento quedará en «Cumple» y el cargador será notificado.'
              : 'El cargador será notificado de la aprobación.'
        }
        etiquetaConfirmar={usaChecklist ? 'Sí, registrar' : 'Sí, aprobar'}
        cargando={procesando}
        onConfirmar={() => enviarDictamen(true)}
        onCancelar={() => setConfirmarAprobar(false)}
      />
      <DialogoConfirmacion
        abierto={confirmarCorreccion}
        titulo={usaChecklist ? '¿Registrar «Con observaciones»?' : '¿Enviar a corrección?'}
        descripcion={
          usaChecklist
            ? `El documento quedará «Con observaciones» con puntaje ${textoPuntajePreview}. El cargador verá las observaciones por condición y podrá subir una versión corregida.`
            : comentariosInline.filter((c) => c.body.trim()).length > 0
              ? `El documento quedará «Rechazado» y el cargador verá ${comentariosInline.filter((c) => c.body.trim()).length} comentario(s) sobre el documento.`
              : 'El documento quedará «Rechazado» y el cargador verá tus observaciones.'
        }
        etiquetaConfirmar="Sí, enviar"
        variant="destructive"
        cargando={procesando}
        onConfirmar={() => enviarDictamen(false)}
        onCancelar={() => setConfirmarCorreccion(false)}
      />
    </div>
  )
}
