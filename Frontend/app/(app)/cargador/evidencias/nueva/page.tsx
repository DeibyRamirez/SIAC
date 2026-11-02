'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import {
  PasoSeleccionContextoCarga,
  type ContextoCargaEvidencia,
} from '@/components/siac/paso-seleccion-contexto-carga'
import { SelectorTramiteCargaEvidencia } from '@/components/siac/selector-tramite-carga-evidencia'
import { ZonaCargaDocx } from '@/components/siac/zona-carga-docx'
import { RegionCarga } from '@/components/siac/estado-carga-lista'
import { EsqueletoCampos } from '@/components/siac/esqueletos'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { periodoAcademicoActual, periodosVigentes } from '@/lib/utilidades/periodo-academico'
import { obtenerProgresoInstitucionApi } from '@/lib/servicios/institucion.servicio'
import { listarProgramasApi } from '@/lib/servicios/programas.servicio'
import {
  obtenerProgresoProgramaApi,
  type ProgresoProcesoSIAC,
} from '@/lib/servicios/progreso-programa.servicio'
import { ErrorApi, apiDisponible } from '@/lib/servicios/cliente-api'
import { enviarRevisionApi } from '@/lib/servicios/evidencias.servicio'
import {
  TAMANO_MAXIMO_EVIDENCIA_MB,
  validarTamanoEvidencia,
} from '@/lib/constantes/documentos'
import type { CodigoDocumentoGuia, Programa } from '@/lib/tipos'
import { programasElegiblesParaCargaEvidencia } from '@/lib/utilidades/filtro-programas-vigencias'
import { extraerMetadatosDocx } from '@/lib/utilidades/extraer-metadatos-docx'
import {
  ETIQUETAS_GUIA,
  guiasPermitidasPorTramite,
  tramiteDesdeSeleccion,
  tramiteDesdeTipo,
  type AlcanceTramiteUI,
  type ModalidadTramiteUI,
} from '@/lib/utilidades/catalogo-tramites-siac'

export default function NuevaEvidenciaPage() {
  return (
    <PlantillaPaginaApp titulo="Cargar evidencia" rol="Cargador">
      <ContenidoNuevaEvidencia />
    </PlantillaPaginaApp>
  )
}

function inferirSeleccionDesdeNombre(
  nombreArchivo: string,
): {
  modalidad?: ModalidadTramiteUI
  alcance?: AlcanceTramiteUI
  codigoGuia?: CodigoDocumentoGuia
} {
  const nombre = nombreArchivo.toLowerCase()

  if (/mejoramiento/.test(nombre) && /institucional/.test(nombre)) {
    return {
      modalidad: 'Renovacion',
      alcance: 'Institucion',
      codigoGuia: 'G4',
    }
  }
  if (/mejoramiento/.test(nombre) && !/institucional/.test(nombre)) {
    return {
      modalidad: 'Renovacion',
      alcance: 'Programa',
      codigoGuia: 'G2',
    }
  }
  if (/institucional/.test(nombre) || /condiciones\s*institucionales/.test(nombre)) {
    return {
      modalidad: /renovaci[oó]n/.test(nombre) ? 'Renovacion' : 'Nuevo',
      alcance: 'Institucion',
      codigoGuia: 'G3',
    }
  }
  if (/documento\s*maestro/.test(nombre) || /registro\s*calificado/.test(nombre)) {
    return {
      modalidad: /renovaci[oó]n/.test(nombre) ? 'Renovacion' : 'Nuevo',
      alcance: 'Programa',
      codigoGuia: 'G1',
    }
  }
  return {}
}

function ContenidoNuevaEvidencia() {
  const router = useRouter()
  const { sesion } = usarSesion()
  const { crearEvidencia, actualizarEvidencia, recargarAlertas } = usarAlmacen()
  const [programas, setProgramas] = useState<Programa[]>([])
  const [contextoCarga, setContextoCarga] = useState<ContextoCargaEvidencia | null>(null)
  const [progreso, setProgreso] = useState<ProgresoProcesoSIAC | null>(null)
  const [cargandoProgreso, setCargandoProgreso] = useState(false)
  const [modalidad, setModalidad] = useState<ModalidadTramiteUI | null>(null)
  const [alcance, setAlcance] = useState<AlcanceTramiteUI | null>(null)
  const [codigoGuia, setCodigoGuia] = useState<CodigoDocumentoGuia | null>(null)
  const [nombre, setNombre] = useState('')
  const [programaId, setProgramaId] = useState('')
  const [periodo, setPeriodo] = useState(periodoAcademicoActual())
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [extrayendo, setExtrayendo] = useState(false)
  const [intentoCargaProgreso, setIntentoCargaProgreso] = useState(0)
  const [errorProgreso, setErrorProgreso] = useState<string | null>(null)
  const contextoInicializado = useRef(false)

  const puedeCargarInstitucion = sesion?.responsableProcesoInstitucional === true
  const soloProcesoInstitucional = puedeCargarInstitucion && programas.length === 0

  const programaActivo = useMemo(
    () => programas.find((p) => p.id === programaId),
    [programas, programaId],
  )

  const tramiteSeleccionado = useMemo(() => {
    if (!modalidad || !alcance) return null
    return tramiteDesdeSeleccion(alcance, modalidad)
  }, [modalidad, alcance])

  const tramiteDesdeProgreso = useMemo(() => {
    if (!progreso?.tipoTramite) return null
    return tramiteDesdeTipo(progreso.tipoTramite)
  }, [progreso])

  const bloquearPasosTramite = Boolean(
    contextoCarga && progreso && tramiteDesdeProgreso && !cargandoProgreso,
  )

  const guiasDisponibles = progreso?.guiasDisponiblesCarga
  const bloqueosCarga = progreso?.bloqueosCarga ?? []

  const contextoListo =
    contextoCarga === 'institucion' ||
    (contextoCarga === 'programa' && Boolean(programaId))

  const configuracionCompleta = Boolean(
    contextoListo && modalidad && alcance && codigoGuia && bloquearPasosTramite,
  )

  const pasoArchivo = 4

  useEffect(() => {
    if (!apiDisponible()) {
      setError('No hay conexión con la API. No se usan programas de prueba.')
      return
    }
    Promise.all([listarProgramasApi()])
      .then(async ([lista]) => {
        const elegibles = await programasElegiblesParaCargaEvidencia(lista)
        setProgramas(elegibles)
        setProgramaId(elegibles[0]?.id ?? '')
        const sinAlcance = elegibles.length === 0 && !sesion?.responsableProcesoInstitucional
        if (sinAlcance) {
          setError('No tiene programas ni proceso institucional asignado. Solicite asignación al administrador.')
        } else {
          setError(null)
        }
      })
      .catch(() => {
        setProgramas([])
        setProgramaId('')
        setError('No se pudieron cargar sus programas asignados.')
      })
  }, [sesion?.responsableProcesoInstitucional])

  useEffect(() => {
    if (contextoInicializado.current) return
    if (programas.length === 0 && !puedeCargarInstitucion) return
    contextoInicializado.current = true
    if (programas.length > 0 && !puedeCargarInstitucion) {
      setContextoCarga('programa')
    }
  }, [programas.length, puedeCargarInstitucion])

  function mensajeErrorProgreso(err: unknown): string {
    if (err instanceof ErrorApi) {
      if (err.codigoEstado === 403) {
        return 'No tiene permiso para el trámite institucional. Solicite asignación como responsable G3/G4 al administrador.'
      }
      if (err.codigoEstado === 404) {
        return 'La institución no está configurada en el sistema. Contacte al administrador.'
      }
    }
    return 'No se pudo cargar el progreso del trámite. Intente de nuevo.'
  }

  useEffect(() => {
    if (!apiDisponible() || !contextoCarga) {
      setProgreso(null)
      setErrorProgreso(null)
      return
    }
    if (contextoCarga === 'programa' && !programaId) {
      setProgreso(null)
      setErrorProgreso(null)
      return
    }

    let cancelado = false
    setCargandoProgreso(true)
    setErrorProgreso(null)
    const promesa =
      contextoCarga === 'institucion'
        ? obtenerProgresoInstitucionApi()
        : obtenerProgresoProgramaApi(programaId)

    promesa
      .then((datos) => {
        if (!cancelado) {
          setProgreso(datos)
          setErrorProgreso(null)
        }
      })
      .catch((err) => {
        if (!cancelado) {
          setProgreso(null)
          setErrorProgreso(mensajeErrorProgreso(err))
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoProgreso(false)
      })

    return () => {
      cancelado = true
    }
  }, [contextoCarga, programaId, intentoCargaProgreso])

  useEffect(() => {
    if (!tramiteDesdeProgreso || !contextoListo) return
    setModalidad(tramiteDesdeProgreso.modalidad)
    setAlcance(tramiteDesdeProgreso.alcance)
  }, [tramiteDesdeProgreso, contextoListo])

  useEffect(() => {
    if (!guiasDisponibles) return
    setCodigoGuia((actual) =>
      actual && guiasDisponibles.includes(actual) ? actual : null,
    )
  }, [guiasDisponibles])

  function manejarContextoChange(valor: ContextoCargaEvidencia) {
    setContextoCarga(valor)
    setCodigoGuia(null)
    setArchivo(null)
    setNombre('')
    setError(null)
    setErrorProgreso(null)
    setProgreso(null)
    if (valor === 'institucion') {
      setModalidad(null)
      setAlcance(null)
    }
  }

  function manejarProgramaChange(id: string) {
    setProgramaId(id)
    setCodigoGuia(null)
    setArchivo(null)
    setNombre('')
    setError(null)
  }

  function manejarModalidadChange(valor: ModalidadTramiteUI) {
    if (bloquearPasosTramite) return
    setModalidad(valor)
    setAlcance(null)
    setCodigoGuia(null)
    setArchivo(null)
    setNombre('')
    setError(null)
  }

  function manejarAlcanceChange(valor: AlcanceTramiteUI) {
    if (bloquearPasosTramite) return
    setAlcance(valor)
    setCodigoGuia(null)
    setArchivo(null)
    setNombre('')
    setError(null)
  }

  function manejarCodigoGuiaChange(valor: CodigoDocumentoGuia) {
    setCodigoGuia(valor)
    setArchivo(null)
    setNombre('')
    setError(null)
  }

  async function manejarArchivoSeleccionado(file: File | null) {
    setArchivo(file)
    if (!file) return
    setExtrayendo(true)
    try {
      if (!bloquearPasosTramite) {
        const inferido = inferirSeleccionDesdeNombre(file.name)
        if (inferido.modalidad) setModalidad(inferido.modalidad)
        if (inferido.alcance) setAlcance(inferido.alcance)
        if (inferido.codigoGuia) setCodigoGuia(inferido.codigoGuia)
      } else if (guiasDisponibles?.length) {
        const inferido = inferirSeleccionDesdeNombre(file.name)
        if (inferido.codigoGuia && guiasDisponibles.includes(inferido.codigoGuia)) {
          setCodigoGuia(inferido.codigoGuia)
        }
      }

      const meta = await extraerMetadatosDocx(file, programas)
      if (meta.nombreSugerido) setNombre(meta.nombreSugerido)
      if (meta.periodo) setPeriodo(meta.periodo)
      if (meta.programaId && contextoCarga === 'programa' && meta.programaId !== programaId) {
        const coincide = programas.some((p) => p.id === meta.programaId)
        if (coincide) setProgramaId(meta.programaId)
      }
    } catch {
      setError('No se pudo leer el contenido del .docx; complete el formulario manualmente.')
    } finally {
      setExtrayendo(false)
    }
  }

  function validarFormulario(): boolean {
    setError(null)
    if (!contextoListo) {
      setError('Seleccione el programa o el trámite institucional para continuar.')
      return false
    }
    if (!configuracionCompleta || !codigoGuia) {
      setError('Seleccione un documento guía disponible para cargar.')
      return false
    }
    if (guiasDisponibles && !guiasDisponibles.includes(codigoGuia)) {
      setError('El documento seleccionado no está disponible para nueva carga en este trámite.')
      return false
    }
    const esInstitucional = contextoCarga === 'institucion'
    if (!esInstitucional && !programaId) {
      setError('Seleccione un programa asignado.')
      return false
    }
    if (!nombre.trim() || !periodo || !archivo) {
      setError('Completa todos los campos y selecciona un archivo.')
      return false
    }
    const documentosPermitidos = progreso
      ? guiasPermitidasPorTramite(progreso.tipoTramite)
      : (tramiteSeleccionado?.documentosGuia ?? [])
    if (!documentosPermitidos.includes(codigoGuia)) {
      setError('El documento seleccionado no corresponde al trámite activo.')
      return false
    }
    const extension = archivo.name.split('.').pop()?.toLowerCase()
    if (extension !== 'docx') {
      setError('Solo se permiten documentos Word (.docx).')
      return false
    }
    const errorTamano = validarTamanoEvidencia(archivo.size)
    if (errorTamano) {
      setError(errorTamano)
      return false
    }
    return true
  }

  async function guardarDocumento(enviarARevision: boolean) {
    if (!validarFormulario() || !archivo || !codigoGuia) return

    setEnviando(true)
    try {
      const esInstitucional = contextoCarga === 'institucion'
      const creada = await crearEvidencia(
        {
          nombre: nombre.trim(),
          programaId: esInstitucional ? '' : programaId,
          periodo,
          autorId: sesion?.usuarioId ?? 'usr-cargador',
          nombreArchivo: archivo.name,
          requiereChecklistMaestro: codigoGuia === 'G1',
          codigoGuia,
        },
        archivo,
        { codigoGuia },
      )

      if (enviarARevision) {
        if (apiDisponible()) {
          await enviarRevisionApi(creada.id)
          await recargarAlertas()
        } else {
          actualizarEvidencia(creada.id, { estado: 'EnRevision' })
        }
        router.push('/cargador/evidencias')
        return
      }

      router.push(`/cargador/evidencias/${creada.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la evidencia.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Gestión documental"
        titulo="Cargar evidencia"
        descripcion="Seleccione primero el programa o el trámite institucional; el sistema fijará el trámite activo y las guías que puede cargar."
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="min-w-0">
          <CardContent className="space-y-6 pt-6">
            <PasoSeleccionContextoCarga
              contexto={contextoCarga}
              onContextoChange={manejarContextoChange}
              programaId={programaId}
              onProgramaChange={manejarProgramaChange}
              programas={programas}
              permitirInstitucion={puedeCargarInstitucion}
              soloInstitucion={soloProcesoInstitucional}
            />

            {cargandoProgreso ? (
              <RegionCarga texto="Cargando trámite y guías disponibles…">
                <EsqueletoCampos campos={3} />
              </RegionCarga>
            ) : null}

            {errorProgreso && contextoListo && !cargandoProgreso ? (
              <div className="space-y-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <p>{errorProgreso}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-red-200 bg-white text-red-800 hover:bg-red-50"
                  onClick={() => setIntentoCargaProgreso((n) => n + 1)}
                >
                  Reintentar
                </Button>
              </div>
            ) : null}

            {contextoListo && !cargandoProgreso && progreso ? (
              <SelectorTramiteCargaEvidencia
                modalidad={modalidad}
                alcance={alcance}
                codigoGuia={codigoGuia}
                permitirAlcanceInstitucion={puedeCargarInstitucion}
                bloquearPasosTramite={bloquearPasosTramite}
                inicioNumeracion={2}
                guiasDisponibles={guiasDisponibles}
                bloqueosCarga={bloqueosCarga}
                onModalidadChange={manejarModalidadChange}
                onAlcanceChange={manejarAlcanceChange}
                onCodigoGuiaChange={manejarCodigoGuiaChange}
              />
            ) : null}

            {!configuracionCompleta && error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 xl:sticky xl:top-4">
          <CardContent className="pt-6">
            {configuracionCompleta && codigoGuia ? (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  guardarDocumento(false)
                }}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Paso {pasoArchivo}</Badge>
                  <h3 className="text-sm font-semibold text-primary">
                    Cargar archivo y metadatos
                  </h3>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                  <strong className="text-foreground">
                    {codigoGuia} — {ETIQUETAS_GUIA[codigoGuia]}
                  </strong>
                  {tramiteSeleccionado && (
                    <p className="mt-1">
                      Trámite: <strong>{tramiteSeleccionado.nombre}</strong>
                      {contextoCarga === 'programa' && programaActivo ? (
                        <>
                          {' '}
                          · Programa: <strong>{programaActivo.nombre}</strong>
                        </>
                      ) : null}
                    </p>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <span className="font-medium">Archivo (.docx)</span>
                  <ZonaCargaDocx
                    archivo={archivo}
                    onArchivoSeleccionado={manejarArchivoSeleccionado}
                    deshabilitado={extrayendo}
                  />
                  <span className="text-xs text-muted-foreground">
                    Solo Word (.docx) · máximo {TAMANO_MAXIMO_EVIDENCIA_MB} MB
                    {extrayendo ? ' · Analizando documento…' : ''}
                  </span>
                </div>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Nombre del documento</span>
                  <input
                    value={nombre}
                    readOnly
                    className="w-full cursor-default rounded-lg border border-input bg-muted px-3 py-2"
                    placeholder="Se completa al seleccionar el .docx"
                    required
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Periodo</span>
                  <select
                    value={periodo}
                    onChange={(evento) => setPeriodo(evento.target.value)}
                    className="w-full rounded-lg border border-input px-3 py-2"
                  >
                    {/* Solo periodos del año actual y siguientes; si los metadatos del .docx traen uno pasado, se conserva. */}
                    {[...new Set([...periodosVigentes(), periodo].filter(Boolean))]
                      .sort()
                      .map((valor) => (
                        <option key={valor} value={valor}>
                          {valor}
                        </option>
                      ))}
                  </select>
                </label>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  Guarda como borrador para revisar y continuar después, o envía directamente
                  a revisión del revisor de calidad.
                </p>
                <div className="flex flex-col gap-2">
                  <Button type="submit" disabled={enviando || extrayendo}>
                    {enviando ? 'Subiendo archivo…' : 'Guardar borrador'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={enviando || extrayendo}
                    onClick={() => guardarDocumento(true)}
                  >
                    {enviando ? 'Enviando…' : 'Enviar a revisión'}
                  </Button>
                  <Link href="/cargador/evidencias">
                    <Button type="button" variant="outline" className="w-full">
                      Cancelar
                    </Button>
                  </Link>
                </div>
              </form>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
                <Badge variant="secondary">Paso {pasoArchivo}</Badge>
                <p className="text-sm font-medium text-primary">
                  Cargar archivo y metadatos
                </p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Complete el programa o trámite institucional y elija un documento guía
                  disponible para habilitar la carga del .docx.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
