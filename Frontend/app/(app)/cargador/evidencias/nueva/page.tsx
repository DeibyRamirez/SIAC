'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { ZonaCargaDocx } from '@/components/siac/zona-carga-docx'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  catalogoFactoresIndicadores,
  periodosSemilla,
  programasSemilla,
} from '@/lib/datos-semilla'
import { listarProgramasApi } from '@/lib/servicios/programas.servicio'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { enviarRevisionApi } from '@/lib/servicios/evidencias.servicio'
import type { Programa } from '@/lib/tipos'
import {
  extraerMetadatosDocx,
  periodoAcademicoActual,
} from '@/lib/utilidades/extraer-metadatos-docx'

export default function NuevaEvidenciaPage() {
  return (
    <PlantillaPaginaApp titulo="Cargar evidencia" rol="Cargador">
      <ContenidoNuevaEvidencia />
    </PlantillaPaginaApp>
  )
}

function ContenidoNuevaEvidencia() {
  const router = useRouter()
  const { sesion } = usarSesion()
  const { crearEvidencia, actualizarEvidencia } = usarAlmacen()
  const [programas, setProgramas] = useState<Programa[]>(programasSemilla)
  const [nombre, setNombre] = useState('')
  const [programaId, setProgramaId] = useState(programasSemilla[0]?.id ?? '')
  const [periodo, setPeriodo] = useState(periodoAcademicoActual())
  const [factor, setFactor] = useState(catalogoFactoresIndicadores[0]?.factor ?? '')
  const [indicador, setIndicador] = useState(
    catalogoFactoresIndicadores[0]?.indicadores[0] ?? '',
  )
  const [esDocumentoMaestro, setEsDocumentoMaestro] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [extrayendo, setExtrayendo] = useState(false)

  const indicadoresDisponibles = useMemo(() => {
    return (
      catalogoFactoresIndicadores.find((f) => f.factor === factor)?.indicadores ?? []
    )
  }, [factor])

  useEffect(() => {
    if (!apiDisponible()) return
    listarProgramasApi()
      .then((lista) => {
        if (lista.length > 0) {
          setProgramas(lista)
          setProgramaId(lista[0].id)
        }
      })
      .catch(() => {
        // Mantiene semilla local
      })
  }, [])

  useEffect(() => {
    if (indicadoresDisponibles.length === 0) return
    if (!indicadoresDisponibles.includes(indicador)) {
      setIndicador(indicadoresDisponibles[0])
    }
  }, [indicadoresDisponibles, indicador])

  async function manejarArchivoSeleccionado(file: File | null) {
    setArchivo(file)
    if (!file) return
    setExtrayendo(true)
    try {
      const meta = await extraerMetadatosDocx(
        file,
        programas,
        catalogoFactoresIndicadores,
      )
      if (meta.nombreSugerido) setNombre(meta.nombreSugerido)
      if (meta.programaId) setProgramaId(meta.programaId)
      if (meta.periodo) setPeriodo(meta.periodo)
      if (meta.factor) setFactor(meta.factor)
      if (meta.indicador) setIndicador(meta.indicador)
      if (/documento\s*maestro/i.test(file.name)) setEsDocumentoMaestro(true)
    } catch {
      setError('No se pudo leer el contenido del .docx; complete el formulario manualmente.')
    } finally {
      setExtrayendo(false)
    }
  }

  function validarFormulario(): boolean {
    setError(null)
    if (!nombre.trim() || !indicador.trim() || !archivo) {
      setError('Completa todos los campos y selecciona un archivo.')
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
    if (!validarFormulario() || !archivo) return

    setEnviando(true)
    try {
      const creada = await crearEvidencia(
        {
          nombre: nombre.trim(),
          programaId,
          periodo,
          factor,
          indicador: indicador.trim(),
          autorId: sesion?.usuarioId ?? 'usr-cargador',
          nombreArchivo: archivo.name,
          requiereChecklistMaestro: esDocumentoMaestro,
        },
        archivo,
        { requiereChecklistMaestro: esDocumentoMaestro },
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
        descripcion="Registra un documento .docx con metadatos alineados al Decreto 1330."
      />

      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              guardarDocumento(false)
            }}
          >
            <div className="space-y-2 text-sm">
              <span className="font-medium">Archivo (.docx)</span>
              <ZonaCargaDocx
                archivo={archivo}
                onArchivoSeleccionado={manejarArchivoSeleccionado}
                deshabilitado={extrayendo}
              />
              <span className="text-xs text-muted-foreground">
                Solo Word (.docx) · máximo 20 MB
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

            <div className="grid gap-4 md:grid-cols-2">
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
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Periodo</span>
                <select
                  value={periodo}
                  onChange={(evento) => setPeriodo(evento.target.value)}
                  className="w-full rounded-lg border border-input px-3 py-2"
                >
                  {[periodoAcademicoActual(), ...periodosSemilla]
                    .filter((v, i, arr) => arr.indexOf(v) === i)
                    .map((valor) => (
                      <option key={valor} value={valor}>
                        {valor}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Factor</span>
              <select
                value={factor}
                onChange={(evento) => setFactor(evento.target.value)}
                className="w-full rounded-lg border border-input px-3 py-2"
              >
                {catalogoFactoresIndicadores.map((item) => (
                  <option key={item.factor} value={item.factor}>
                    {item.factor}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Indicador</span>
              <select
                value={indicador}
                onChange={(evento) => setIndicador(evento.target.value)}
                className="w-full rounded-lg border border-input px-3 py-2"
                required
              >
                {indicadoresDisponibles.map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={esDocumentoMaestro}
                onChange={(e) => setEsDocumentoMaestro(e.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              <span>
                Es Documento Maestro (el revisor evaluará las 9 condiciones de programa)
              </span>
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <p className="text-xs text-muted-foreground">
              Guarda como borrador para revisar y continuar después, o envía directamente a
              revisión del revisor de calidad.
            </p>
            <div className="flex flex-wrap gap-3">
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
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
