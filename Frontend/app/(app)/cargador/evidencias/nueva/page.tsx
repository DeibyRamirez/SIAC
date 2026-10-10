'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { SelectorTramiteCargaEvidencia } from '@/components/siac/selector-tramite-carga-evidencia'
import { ZonaCargaDocx } from '@/components/siac/zona-carga-docx'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { periodoAcademicoActual, periodosConActual } from '@/lib/utilidades/periodo-academico'
import {
  obtenerResumenInstitucionApi,
  type InstitucionResumen,
} from '@/lib/servicios/institucion.servicio'
import { listarProgramasApi } from '@/lib/servicios/programas.servicio'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { enviarRevisionApi } from '@/lib/servicios/evidencias.servicio'
import type { CodigoDocumentoGuia, Programa } from '@/lib/tipos'
import { extraerMetadatosDocx } from '@/lib/utilidades/extraer-metadatos-docx'
import {
  ETIQUETAS_GUIA,
  documentosExigidosPorSeleccion,
  guiasPermitidasPorTramite,
  tramiteDesdeSeleccion,
  tramiteDesdeTipo,
  type AlcanceTramiteUI,
  type ModalidadTramiteUI,
  type TipoTramiteSIAC,
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
  const { crearEvidencia, actualizarEvidencia } = usarAlmacen()
  const [programas, setProgramas] = useState<Programa[]>([])
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
  const [resumenInstitucion, setResumenInstitucion] = useState<InstitucionResumen | null>(null)

  const puedeCargarInstitucion = sesion?.responsableProcesoInstitucional === true

  const tramiteInstitucionalActivo = useMemo(() => {
    const tipo = resumenInstitucion?.tipoTramiteActivo
    if (!tipo) return null
    return tramiteDesdeTipo(tipo)
  }, [resumenInstitucion])

  const soloProcesoInstitucional = puedeCargarInstitucion && programas.length === 0

  const programaActivo = useMemo(
    () => programas.find((p) => p.id === programaId),
    [programas, programaId],
  )

  const tramiteSeleccionado = useMemo(() => {
    if (!modalidad || !alcance) return null
    return tramiteDesdeSeleccion(alcance, modalidad)
  }, [modalidad, alcance])

  const tramiteDesdePrograma = useMemo(() => {
    const tipo = programaActivo?.tipoTramiteActivo as TipoTramiteSIAC | undefined
    if (!tipo) return null
    return tramiteDesdeTipo(tipo)
  }, [programaActivo])

  const configuracionCompleta = Boolean(modalidad && alcance && codigoGuia)

  useEffect(() => {
    if (!apiDisponible()) {
      setError('No hay conexión con la API. No se usan programas de prueba.')
      return
    }
    const cargarResumen =
      sesion?.responsableProcesoInstitucional === true
        ? obtenerResumenInstitucionApi().then(setResumenInstitucion).catch(() => setResumenInstitucion(null))
        : Promise.resolve()

    Promise.all([listarProgramasApi(), cargarResumen])
      .then(([lista]) => {
        setProgramas(lista)
        setProgramaId(lista[0]?.id ?? '')
        const sinAlcance = lista.length === 0 && !sesion?.responsableProcesoInstitucional
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
    if (!soloProcesoInstitucional || !tramiteInstitucionalActivo) return
    setModalidad(tramiteInstitucionalActivo.modalidad)
    setAlcance(tramiteInstitucionalActivo.alcance)
    const permitidas = guiasPermitidasPorTramite(tramiteInstitucionalActivo.tipo)
    setCodigoGuia((actual) => (actual && permitidas.includes(actual) ? actual : null))
  }, [soloProcesoInstitucional, tramiteInstitucionalActivo])

  useEffect(() => {
    if (alcance !== 'Institucion' || !tramiteInstitucionalActivo || tramiteDesdePrograma) return
    setModalidad(tramiteInstitucionalActivo.modalidad)
    const documentos = guiasPermitidasPorTramite(tramiteInstitucionalActivo.tipo)
    setCodigoGuia((actual) =>
      actual && documentos.includes(actual) ? actual : documentos.length === 1 ? documentos[0] : null,
    )
  }, [alcance, tramiteInstitucionalActivo, tramiteDesdePrograma])

  useEffect(() => {
    if (!tramiteDesdePrograma) return
    setModalidad(tramiteDesdePrograma.modalidad)
    setAlcance(tramiteDesdePrograma.alcance)
    const permitidas = guiasPermitidasPorTramite(tramiteDesdePrograma.tipo)
    setCodigoGuia((actual) => (actual && permitidas.includes(actual) ? actual : null))
  }, [tramiteDesdePrograma])

  function manejarModalidadChange(valor: ModalidadTramiteUI) {
    if (tramiteDesdePrograma || soloProcesoInstitucional) return
    setModalidad(valor)
    setAlcance(null)
    setCodigoGuia(null)
    setArchivo(null)
    setNombre('')
    setError(null)
  }

  function manejarAlcanceChange(valor: AlcanceTramiteUI) {
    if (tramiteDesdePrograma || soloProcesoInstitucional) return
    setAlcance(valor)
    if (!modalidad) return
    const documentos = documentosExigidosPorSeleccion(valor, modalidad)
    setCodigoGuia(documentos.length === 1 ? documentos[0] : null)
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
      const inferido = inferirSeleccionDesdeNombre(file.name)
      if (inferido.modalidad) setModalidad(inferido.modalidad)
      if (inferido.alcance) setAlcance(inferido.alcance)
      if (inferido.codigoGuia) setCodigoGuia(inferido.codigoGuia)

      const meta = await extraerMetadatosDocx(file, programas)
      if (meta.nombreSugerido) setNombre(meta.nombreSugerido)
      if (meta.programaId) setProgramaId(meta.programaId)
      if (meta.periodo) setPeriodo(meta.periodo)
    } catch {
      setError('No se pudo leer el contenido del .docx; complete el formulario manualmente.')
    } finally {
      setExtrayendo(false)
    }
  }

  function validarFormulario(): boolean {
    setError(null)
    if (!configuracionCompleta || !codigoGuia) {
      setError('Complete los pasos 1 a 3 para definir el documento a cargar.')
      return false
    }
    const esInstitucional = codigoGuia === 'G3' || codigoGuia === 'G4'
    if (!esInstitucional && !programaId) {
      setError('Seleccione un programa asignado.')
      return false
    }
    if (!nombre.trim() || !periodo || !archivo) {
      setError('Completa todos los campos y selecciona un archivo.')
      return false
    }
    const documentosPermitidos = tramiteDesdePrograma
      ? guiasPermitidasPorTramite(tramiteDesdePrograma.tipo)
      : esInstitucional && resumenInstitucion
        ? guiasPermitidasPorTramite(resumenInstitucion.tipoTramiteActivo)
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
    if (archivo.size > 25 * 1024 * 1024) {
      setError('El archivo supera el tamaño máximo permitido (25 MB).')
      return false
    }
    return true
  }

  async function guardarDocumento(enviarARevision: boolean) {
    if (!validarFormulario() || !archivo || !codigoGuia) return

    setEnviando(true)
    try {
      const esInstitucional = codigoGuia === 'G3' || codigoGuia === 'G4'
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
        descripcion="Indique primero el trámite y el tipo de documento; luego cargue el .docx y complete los metadatos."
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="min-w-0">
          <CardContent className="space-y-6 pt-6">
            <SelectorTramiteCargaEvidencia
              modalidad={modalidad}
              alcance={alcance}
              codigoGuia={codigoGuia}
              tramiteBloqueado={Boolean(tramiteDesdePrograma) || soloProcesoInstitucional}
              permitirAlcanceInstitucion={puedeCargarInstitucion}
              onModalidadChange={manejarModalidadChange}
              onAlcanceChange={manejarAlcanceChange}
              onCodigoGuiaChange={manejarCodigoGuiaChange}
            />
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
                  <Badge variant="secondary">Paso 4</Badge>
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
                    Solo Word (.docx) · máximo 25 MB
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

                {alcance !== 'Institucion' && codigoGuia !== 'G3' && codigoGuia !== 'G4' ? (
                  <label className="block space-y-2 text-sm">
                    <span className="font-medium">Programa</span>
                    <select
                      value={programaId}
                      onChange={(evento) => setProgramaId(evento.target.value)}
                      className="w-full rounded-lg border border-input px-3 py-2"
                    >
                      {programas.map((programa) => (
                        <option key={programa.id} value={programa.id}>
                          {programa.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Periodo</span>
                  <select
                    value={periodo}
                    onChange={(evento) => setPeriodo(evento.target.value)}
                    className="w-full rounded-lg border border-input px-3 py-2"
                  >
                    {periodosConActual()
                      .filter((v, i, arr) => arr.indexOf(v) === i)
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
                    {enviando ? 'Guardando…' : 'Guardar borrador'}
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
                <Badge variant="secondary">Paso 4</Badge>
                <p className="text-sm font-medium text-primary">
                  Cargar archivo y metadatos
                </p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Complete los pasos 1 a 3 para habilitar la carga del documento .docx y
                  los campos de metadatos en esta columna.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
