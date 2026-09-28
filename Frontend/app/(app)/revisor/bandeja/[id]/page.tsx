'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
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
  calcularPorcentajeCondiciones,
} from '@/lib/condiciones-documento-maestro'
import {
  CODIGOS_CONDICION_INSTITUCIONAL,
  calcularPorcentajeCondicionesInstitucionales,
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
  obtenerEvidenciaApi,
  obtenerUrlDescargaApi,
} from '@/lib/servicios/evidencias.servicio'
import type { Evidencia } from '@/lib/tipos'
import {
  limpiarBorradorRevision,
  usarBorradorRevisionDocx,
} from '@/lib/hooks/usar-borrador-revision-docx'
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
  const [condicionesInstitucionales, setCondicionesInstitucionales] = useState<
    EstadoCondicionInstitucionalDictamen[]
  >(crearEstadosCondicionInstitucionalIniciales())
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
    }) => {
      setCondiciones(borrador.condiciones)
      setObservacionesGenerales(borrador.observacionesGenerales)
    },
    [],
  )

  usarBorradorRevisionDocx(
    params.id,
    versionActual,
    condiciones,
    observacionesGenerales,
    restaurarBorrador,
  )

  const porcentajePreview = useMemo(() => {
    if (usaChecklistInstitucional) {
      const cumplidas = condicionesInstitucionales.filter(
        (c) => c.decision === 'correcto',
      ).length
      return calcularPorcentajeCondicionesInstitucionales(cumplidas)
    }
    const cumplidas = condiciones.filter((c) => c.decision === 'correcto').length
    return calcularPorcentajeCondiciones(cumplidas)
  }, [condiciones, condicionesInstitucionales, usaChecklistInstitucional])

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

  async function enviarDictamen(aprobacionTotal: boolean) {
    if (!evidencia) return
    if (!puedeDictaminar) {
      setMensaje('Solo se puede dictaminar evidencias en estado En revisión.')
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

    const estado = aprobacionTotal ? 'Validado' : 'Rechazado'
    const observaciones = usaChecklist
      ? (usaChecklistInstitucional
          ? payloadCondicionesInstitucionales
          : payloadCondiciones)
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
          condiciones: usaChecklistPrograma ? payloadCondiciones : undefined,
          condicionesInstitucionales: usaChecklistInstitucional
            ? payloadCondicionesInstitucionales
            : undefined,
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
      limpiarBorradorRevision(evidencia.id, versionActual)
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

            {usaChecklistPrograma ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-primary">
                    Checklist G1 — 9 condiciones de programa
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
            ) : usaChecklistInstitucional ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-primary">
                    Checklist G3 — 6 condiciones institucionales
                  </p>
                  <span className="text-sm font-medium text-esmeralda">
                    {porcentajePreview}%
                  </span>
                </div>
                <ChecklistCondicionesInstitucionales
                  estados={condicionesInstitucionales}
                  onChange={setCondicionesInstitucionales}
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
                <p className="text-xs text-muted-foreground">
                  {guiaDocumento === 'G2' || guiaDocumento === 'G4'
                    ? 'Documento de respaldo de mejoramiento: aprueba si cumple el artículo correspondiente o envía observaciones de corrección.'
                    : 'Para aprobar, el campo de observaciones debe estar vacío.'}
                </p>
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
                disabled={
                  !puedeDictaminar ||
                  procesando ||
                  (usaChecklist && !todasCumplen) ||
                  observacionesBloqueanAprobar
                }
              >
                Aprobar documento
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
        descripcion={
          usaChecklistInstitucional
            ? 'Las 6 condiciones institucionales deben estar cumplidas. El cargador será notificado.'
            : usaChecklistPrograma
              ? 'Las 9 condiciones de programa deben estar cumplidas. El cargador será notificado.'
              : 'El cargador será notificado de la aprobación.'
        }
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
