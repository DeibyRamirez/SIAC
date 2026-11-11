'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { DialogoSubirVersionRevisor } from '@/components/siac/dialogo-subir-version-revisor'
import { EsqueletoContenidoPagina } from '@/components/siac/esqueletos-paginas'
import { ListaVersionesEvidencia } from '@/components/siac/lista-versiones-evidencia'
import { EncabezadoPagina, PanelVacio } from '@/components/siac/tarjeta-acceso'
import { VisorDocumentoInline } from '@/components/siac/visor-documento-inline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { obtenerBlobDocxEvidenciaApi } from '@/lib/servicios/descarga-binaria'
import {
  listarVersionesApi,
  obtenerDiffVersionesApi,
  obtenerEvidenciaApi,
  type DiffVersionesApi,
  type EvidenciaVersionApi,
} from '@/lib/servicios/evidencias.servicio'
import type { Evidencia } from '@/lib/tipos'
import {
  DESCRIPCIONES_GUIA,
  ETIQUETAS_GUIA,
} from '@/lib/utilidades/catalogo-tramites-siac'
import {
  esDocumentoAprobado,
  etiquetaEstadoEvidencia,
  formatoVisorDesdeArchivo,
  mapearEvidenciaDesdeApi,
} from '@/lib/utilidades-siac'
import { cn } from '@/lib/utils'

export default function HistorialVersionesRevisorPage() {
  return (
    <PlantillaPaginaApp titulo="Historial de versiones" rol="Revisor">
      <ContenidoHistorialVersiones />
    </PlantillaPaginaApp>
  )
}

function ContenidoHistorialVersiones() {
  const params = useParams<{ id: string }>()
  const [evidencia, setEvidencia] = useState<Evidencia | null>(null)
  const [versiones, setVersiones] = useState<EvidenciaVersionApi[]>([])
  const [versionSeleccionada, setVersionSeleccionada] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [descargandoNumero, setDescargandoNumero] = useState<number | null>(null)
  const [mostrarCambios, setMostrarCambios] = useState(false)
  const [diffVersiones, setDiffVersiones] = useState<DiffVersionesApi | null>(null)
  const [cargandoDiff, setCargandoDiff] = useState(false)
  const [errorDiff, setErrorDiff] = useState<string | null>(null)
  const [dialogoVersionAbierto, setDialogoVersionAbierto] = useState(false)

  const cargar = useCallback(
    async (seleccionar?: number) => {
      if (!apiDisponible()) {
        setError('La API no está disponible.')
        setCargando(false)
        return
      }
      setCargando(true)
      try {
        const [evidenciaApi, lista] = await Promise.all([
          obtenerEvidenciaApi(params.id),
          listarVersionesApi(params.id),
        ])
        const mapeada = mapearEvidenciaDesdeApi(evidenciaApi)
        setEvidencia(mapeada)
        setVersiones(lista)
        const activa = mapeada.version ?? lista[0]?.numero ?? 1
        setVersionSeleccionada(seleccionar ?? activa)
        setError(null)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el historial de versiones.',
        )
      } finally {
        setCargando(false)
      }
    },
    [params.id],
  )

  useEffect(() => {
    void cargar()
  }, [cargar])

  useEffect(() => {
    if (
      !mostrarCambios ||
      !evidencia ||
      versionSeleccionada < 2 ||
      diffVersiones
    ) {
      return
    }
    let cancelado = false
    setCargandoDiff(true)
    setErrorDiff(null)
    obtenerDiffVersionesApi(
      evidencia.id,
      versionSeleccionada - 1,
      versionSeleccionada,
    )
      .then((resultado) => {
        if (!cancelado) setDiffVersiones(resultado)
      })
      .catch((err) => {
        if (!cancelado) {
          setErrorDiff(
            err instanceof Error
              ? err.message
              : 'No se pudo comparar las versiones.',
          )
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoDiff(false)
      })
    return () => {
      cancelado = true
    }
  }, [mostrarCambios, versionSeleccionada, evidencia, diffVersiones])

  async function descargarVersion(version: EvidenciaVersionApi) {
    setDescargandoNumero(version.numero)
    try {
      const blob = await obtenerBlobDocxEvidenciaApi(params.id, version.numero)
      const nombre = version.nombreArchivo.toLowerCase().endsWith('.docx')
        ? version.nombreArchivo
        : `${version.nombreArchivo}.docx`
      const enlace = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = enlace
      anchor.download = nombre
      anchor.click()
      URL.revokeObjectURL(enlace)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudo preparar el documento para descarga.',
      )
    } finally {
      setDescargandoNumero(null)
    }
  }

  function seleccionarVersion(numero: number) {
    setVersionSeleccionada(numero)
    setMostrarCambios(false)
    setDiffVersiones(null)
    setErrorDiff(null)
  }

  function verCambiosDeVersion(version: EvidenciaVersionApi) {
    setVersionSeleccionada(version.numero)
    setMostrarCambios(true)
    setDiffVersiones(null)
    setErrorDiff(null)
  }

  async function manejarPublicada(actualizada: Evidencia) {
    const mapeada = mapearEvidenciaDesdeApi(actualizada)
    setEvidencia(mapeada)
    setMostrarCambios(false)
    setDiffVersiones(null)
    setErrorDiff(null)
    await cargar(mapeada.version)
  }

  if (cargando && !evidencia) {
    return <EsqueletoContenidoPagina tipo="detalle" />
  }

  if (error || !evidencia) {
    return (
      <div className="space-y-4">
        <EncabezadoPagina
          etiqueta="Mis revisiones / Historial de versiones"
          titulo="Historial no disponible"
          descripcion={error ?? 'La evidencia solicitada no existe.'}
          accion={
            <Button
              variant="outline"
              render={<Link href="/revisor/revisiones" />}
              nativeButton={false}
            >
              Volver a Mis revisiones
            </Button>
          }
        />
        <PanelVacio mensaje="No se pudo consultar el historial de la evidencia." />
      </div>
    )
  }

  const activa = evidencia.version ?? 1
  const versionVista =
    versiones.find((version) => version.numero === versionSeleccionada) ??
    versiones[0]
  const guia = evidencia.codigoGuia
    ? `${evidencia.codigoGuia} — ${ETIQUETAS_GUIA[evidencia.codigoGuia]}`
    : 'Sin guía'
  const descripcionGuia = evidencia.codigoGuia
    ? DESCRIPCIONES_GUIA[evidencia.codigoGuia]
    : 'Consulta el documento vigente y las versiones anteriores.'
  const puedeSubir = esDocumentoAprobado(evidencia.estado)

  const botonSubir = puedeSubir ? (
    <Button type="button" onClick={() => setDialogoVersionAbierto(true)}>
      <Upload className="size-4" aria-hidden />
      Subir nueva versión
    </Button>
  ) : (
    <div
      className="group relative inline-flex"
      tabIndex={0}
      aria-describedby="motivo-subir-version"
    >
      <Button type="button" disabled>
        <Upload className="size-4" aria-hidden />
        Subir nueva versión
      </Button>
      <span
        id="motivo-subir-version"
        role="tooltip"
        className="pointer-events-none absolute top-full right-0 z-20 mt-2 w-64 rounded-lg bg-primary px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        Solo puedes subir una nueva versión cuando el documento está aprobado.
        Estado actual: {etiquetaEstadoEvidencia(evidencia.estado)}.
      </span>
    </div>
  )

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Mis revisiones / Historial de versiones"
        titulo={evidencia.nombre}
        descripcion={`${guia}. ${descripcionGuia}`}
        accion={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              render={<Link href="/revisor/revisiones" />}
              nativeButton={false}
            >
              Volver a Mis revisiones
            </Button>
            {botonSubir}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="min-w-0">
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                Versión {versionVista?.numero ?? versionSeleccionada}
              </Badge>
              <Badge variant="outline">
                {etiquetaEstadoEvidencia(evidencia.estado)}
              </Badge>
              {versionVista?.numero === activa ? (
                <Badge variant="outline">Activa</Badge>
              ) : (
                <Badge variant="outline">Anterior</Badge>
              )}
              {versionVista?.nombreArchivo ? (
                <span
                  className="min-w-0 truncate text-xs text-muted-foreground"
                  title={versionVista.nombreArchivo}
                >
                  {versionVista.nombreArchivo}
                </span>
              ) : null}
            </div>
            {versionVista ? (
              <VisorDocumentoInline
                titulo={versionVista.nombreArchivo}
                formato={formatoVisorDesdeArchivo(versionVista.nombreArchivo)}
                evidenciaId={evidencia.id}
                versionDocumento={versionVista.numero}
                claveCache={`${evidencia.id}-${versionVista.numero}`}
                className="min-h-[560px]"
                modoCambios={
                  versionVista.numero >= 2
                    ? {
                        activo: mostrarCambios,
                        onToggle: () => setMostrarCambios((valor) => !valor),
                        etiquetaInactiva: `Ver cambios v${versionVista.numero - 1} → v${versionVista.numero}`,
                        etiquetaActiva: 'Ocultar cambios',
                        deshabilitado: !apiDisponible(),
                      }
                    : undefined
                }
                anotacionesCambios={diffVersiones?.lineas}
                pieCambios={
                  cargandoDiff ? (
                    <div
                      className="flex items-center gap-2"
                      role="status"
                      aria-live="polite"
                      aria-busy="true"
                    >
                      <span className="sr-only">Comparando versiones…</span>
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-3 w-48" />
                    </div>
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
                        .filter((media) => media.estado !== 'sinCambios')
                        .map((media) => (
                          <span
                            key={media.part}
                            className={cn(
                              'rounded-full px-2 py-0.5 font-medium',
                              media.estado === 'agregado' &&
                                'bg-emerald-100 text-emerald-800',
                              media.estado === 'eliminado' &&
                                'bg-red-100 text-red-700',
                              media.estado === 'modificado' &&
                                'bg-amber-100 text-amber-800',
                            )}
                            title={media.part}
                          >
                            {media.estado}: {media.part.split('/').pop()}
                          </span>
                        ))}
                    </div>
                  ) : null
                }
              />
            ) : (
              <PanelVacio mensaje="Esta evidencia todavía no tiene versiones." />
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Historial de versiones</CardTitle>
          </CardHeader>
          <CardContent>
            <ListaVersionesEvidencia
              versiones={versiones}
              versionActiva={activa}
              seleccionada={versionSeleccionada}
              descargandoNumero={descargandoNumero}
              onSeleccionar={(version) => seleccionarVersion(version.numero)}
              onDescargar={(version) => void descargarVersion(version)}
              onVerCambios={verCambiosDeVersion}
            />
          </CardContent>
        </Card>
      </div>

      <DialogoSubirVersionRevisor
        abierto={dialogoVersionAbierto}
        onCerrar={() => setDialogoVersionAbierto(false)}
        evidenciaId={evidencia.id}
        versionOrigen={activa}
        nombreDocumento={evidencia.nombreArchivo}
        onPublicada={manejarPublicada}
      />
    </div>
  )
}
