'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { BarChart3, FileSpreadsheet, Loader2 } from 'lucide-react'

import { usarSesion } from '@/components/auth/proveedor-sesion'
import { DialogoImportarCifras } from '@/components/siac/dialogo-importar-cifras'
import { GraficoBarrasCifras } from '@/components/siac/grafico-barras-cifras'
import { GraficoDistribucion } from '@/components/siac/grafico-distribucion'
import { GraficoLineaCifras } from '@/components/siac/grafico-linea-cifras'
import { TarjetaKpi } from '@/components/siac/tarjeta-kpi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  obtenerCifrasCategoriaApi,
  obtenerFiltrosCifrasApi,
} from '@/lib/servicios/cifras.servicio'
import type { RespuestaCifras, RespuestaFiltrosCifras } from '@/lib/tipos/cifras'
import {
  agruparDesglose,
  etiquetaDimension,
  etiquetaFuente,
  formatearActualizadoBogota,
  formatearValorIndicador,
  tipoGraficoCifras,
  varianteFuente,
} from '@/lib/utilidades/cifras'
import {
  coincidirOpcionFiltro,
  construirUrlCifras,
  filtrosCifrasParaApi,
  leerFiltrosCifrasUrl,
  OPCION_TODOS_CIFRAS,
  type FiltrosCifrasUrl,
} from '@/lib/utilidades/parametros-cifras-url'
import { manejarCambioSelect } from '@/lib/utilidades-siac'

const ACENTOS_KPI = ['esmeralda', 'cyan', 'ocre', 'purpura'] as const

interface PanelCifrasCategoriaProps {
  categoriaId: string
  categoriaTitulo?: string
  /** Periodo de respaldo cuando la URL no trae uno (p. ej. endpoint heredado). */
  periodoInicial?: string
  mensajeEncabezado?: string
}

export function PanelCifrasCategoria({
  categoriaId,
  categoriaTitulo,
  periodoInicial,
  mensajeEncabezado,
}: PanelCifrasCategoriaProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { sesion } = usarSesion()
  const esAdministrador =
    sesion?.rol === 'Administrador' || sesion?.rol === 'SuperAdmin'

  const filtros = useMemo(() => leerFiltrosCifrasUrl(searchParams), [searchParams])
  const [datos, setDatos] = useState<RespuestaCifras | null>(null)
  const [opciones, setOpciones] = useState<RespuestaFiltrosCifras | null>(null)
  const [cargandoFiltros, setCargandoFiltros] = useState(true)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)

  const periodoEfectivo = filtros.periodo || periodoInicial || ''

  const navegar = useCallback(
    (cambios: Partial<FiltrosCifrasUrl>) => {
      router.replace(construirUrlCifras({ ...filtros, ...cambios }, pathname), {
        scroll: false,
      })
    },
    [filtros, pathname, router],
  )

  // Opciones reales de filtros (no el catálogo institucional): dependen de la categoría
  // y de la facultad seleccionada (los programas se recargan al cambiarla).
  useEffect(() => {
    let vigente = true
    setCargandoFiltros(true)
    obtenerFiltrosCifrasApi(categoriaId, {
      periodo: filtros.periodo || undefined,
      facultad: filtros.facultad === OPCION_TODOS_CIFRAS ? undefined : filtros.facultad,
    })
      .then((respuesta) => {
        if (vigente) setOpciones(respuesta)
      })
      .catch(() => {
        if (vigente) setOpciones(null)
      })
      .finally(() => {
        if (vigente) setCargandoFiltros(false)
      })
    return () => {
      vigente = false
    }
  }, [categoriaId, filtros.facultad, filtros.periodo, version])

  // Un valor de la URL que ya no existe en las opciones se ignora y se limpia el query param.
  // Si la categoría no tiene registros (p. ej. respaldo semilla), no se toca la URL.
  useEffect(() => {
    if (cargandoFiltros || !opciones) return
    const hayOpcionesReales =
      opciones.periodos.length > 0 ||
      opciones.facultades.length > 0 ||
      opciones.sedes.length > 0
    if (!hayOpcionesReales) return

    const cambios: Partial<FiltrosCifrasUrl> = {}
    if (filtros.periodo && !opciones.periodos.includes(filtros.periodo)) {
      cambios.periodo = ''
    }
    if (filtros.facultad !== OPCION_TODOS_CIFRAS) {
      const canonica = coincidirOpcionFiltro(opciones.facultades, filtros.facultad)
      if (!canonica) cambios.facultad = OPCION_TODOS_CIFRAS
      else if (canonica !== filtros.facultad) cambios.facultad = canonica
    }
    if (filtros.programa !== OPCION_TODOS_CIFRAS) {
      const canonico = coincidirOpcionFiltro(opciones.programas, filtros.programa)
      if (!canonico) cambios.programa = OPCION_TODOS_CIFRAS
      else if (canonico !== filtros.programa) cambios.programa = canonico
    }
    if (filtros.sede !== OPCION_TODOS_CIFRAS && opciones.sedes.length > 0) {
      const canonica = coincidirOpcionFiltro(opciones.sedes, filtros.sede)
      if (!canonica) cambios.sede = OPCION_TODOS_CIFRAS
      else if (canonica !== filtros.sede) cambios.sede = canonica
    }

    if (Object.keys(cambios).length > 0) navegar(cambios)
  }, [cargandoFiltros, opciones, filtros, navegar])

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError(null)
    obtenerCifrasCategoriaApi(categoriaId, {
      ...filtrosCifrasParaApi({ ...filtros, periodo: periodoEfectivo }),
    })
      .then((respuesta) => {
        if (vigente) setDatos(respuesta)
      })
      .catch((err: Error) => {
        if (!vigente) return
        setDatos(null)
        setError(err.message ?? 'No fue posible cargar las cifras de la categoría.')
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [categoriaId, filtros, periodoEfectivo, version])

  const periodos = useMemo(() => {
    const reales = opciones?.periodos ?? []
    if (reales.length > 0) return reales
    return datos?.periodosDisponibles ?? []
  }, [opciones?.periodos, datos?.periodosDisponibles])

  const opcionesPeriodo = useMemo(
    () => [
      { value: OPCION_TODOS_CIFRAS, label: 'Periodo más reciente' },
      ...periodos.map((periodo) => ({ value: periodo, label: periodo })),
    ],
    [periodos],
  )

  const facultades = opciones?.facultades ?? []
  const opcionesFacultad = useMemo(
    () => [
      { value: OPCION_TODOS_CIFRAS, label: 'Todas las facultades' },
      ...facultades.map((facultad) => ({ value: facultad, label: facultad })),
    ],
    [facultades],
  )

  const programas = opciones?.programas ?? []
  const opcionesPrograma = useMemo(
    () => [
      { value: OPCION_TODOS_CIFRAS, label: 'Todos los programas' },
      ...programas.map((programa) => ({ value: programa, label: programa })),
    ],
    [programas],
  )

  const sedes = opciones?.sedes ?? []
  const opcionesSede = useMemo(
    () => [
      { value: OPCION_TODOS_CIFRAS, label: 'Todas las sedes' },
      ...sedes.map((sede) => ({ value: sede, label: sede })),
    ],
    [sedes],
  )

  if (cargando && !datos) {
    return (
      <div
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="size-4 animate-spin text-esmeralda" />
        Cargando cifras…
      </div>
    )
  }

  if (error || !datos) {
    return (
      <div className="space-y-4 rounded-xl border bg-white p-6">
        <p className="text-sm text-destructive">{error ?? 'Sin datos disponibles.'}</p>
        <Button type="button" onClick={() => setVersion((valor) => valor + 1)}>
          Reintentar
        </Button>
      </div>
    )
  }

  const indicadores = datos.indicadores ?? []
  const sinCoincidencias = datos.meta.sinCoincidencias === true
  const sinDatos = indicadores.length === 0 && !sinCoincidencias

  return (
    <div className="space-y-6">
      {mensajeEncabezado ? (
        <p className="rounded-lg border border-esmeralda/30 bg-esmeralda/5 px-4 py-3 text-sm text-muted-foreground">
          {mensajeEncabezado}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Periodo</span>
          <Select
            value={filtros.periodo || OPCION_TODOS_CIFRAS}
            items={opcionesPeriodo}
            onValueChange={manejarCambioSelect((valor) =>
              navegar({ periodo: valor === OPCION_TODOS_CIFRAS ? '' : valor }),
            )}
          >
            <SelectTrigger className="w-[190px]" aria-label="Filtrar por periodo">
              <SelectValue placeholder="Periodo más reciente" />
            </SelectTrigger>
            <SelectContent>
              {opcionesPeriodo.map((opcion) => (
                <SelectItem key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {facultades.length > 0 ? (
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Facultad</span>
            <Select
              value={filtros.facultad}
              items={opcionesFacultad}
              onValueChange={manejarCambioSelect((valor) =>
                navegar({ facultad: valor, programa: OPCION_TODOS_CIFRAS }),
              )}
            >
              <SelectTrigger className="w-[220px]" aria-label="Filtrar por facultad">
                <SelectValue placeholder="Todas las facultades" />
              </SelectTrigger>
              <SelectContent>
                {opcionesFacultad.map((opcion) => (
                  <SelectItem key={opcion.value} value={opcion.value}>
                    {opcion.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : null}

        {programas.length > 0 ? (
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Programa</span>
            <Select
              value={filtros.programa}
              items={opcionesPrograma}
              onValueChange={manejarCambioSelect((valor) => navegar({ programa: valor }))}
            >
              <SelectTrigger className="w-[220px]" aria-label="Filtrar por programa">
                <SelectValue placeholder="Todos los programas" />
              </SelectTrigger>
              <SelectContent>
                {opcionesPrograma.map((opcion) => (
                  <SelectItem key={opcion.value} value={opcion.value}>
                    {opcion.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : null}

        {sedes.length > 0 ? (
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Sede</span>
            <Select
              value={filtros.sede}
              items={opcionesSede}
              onValueChange={manejarCambioSelect((valor) => navegar({ sede: valor }))}
            >
              <SelectTrigger className="w-[220px]" aria-label="Filtrar por sede">
                <SelectValue placeholder="Todas las sedes" />
              </SelectTrigger>
              <SelectContent>
                {opcionesSede.map((opcion) => (
                  <SelectItem key={opcion.value} value={opcion.value}>
                    {opcion.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {esAdministrador && !sinCoincidencias ? (
            <Button type="button" variant="outline" onClick={() => setDialogoAbierto(true)}>
              <FileSpreadsheet className="size-4" />
              Importar Excel
            </Button>
          ) : null}
          <span className="flex items-center gap-2">
            Fuente
            <Badge variant={varianteFuente(datos.meta.fuente)}>
              {etiquetaFuente(datos.meta.fuente)}
            </Badge>
          </span>
          <span>Actualizado {formatearActualizadoBogota(datos.meta.actualizadoEn)}</span>
        </div>
      </div>

      {sinCoincidencias ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center">
          <BarChart3 className="mx-auto mb-3 size-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            No hay datos para los filtros seleccionados
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() =>
              navegar({
                periodo: '',
                facultad: OPCION_TODOS_CIFRAS,
                programa: OPCION_TODOS_CIFRAS,
                sede: OPCION_TODOS_CIFRAS,
              })
            }
          >
            Limpiar filtros
          </Button>
        </div>
      ) : sinDatos ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center">
          <BarChart3 className="mx-auto mb-3 size-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            Aún no hay cifras cargadas para esta categoría y periodo
          </p>
          {esAdministrador ? (
            <Button className="mt-4" onClick={() => setDialogoAbierto(true)}>
              <FileSpreadsheet className="size-4" />
              Importar Excel
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {indicadores.map((indicador, indice) => (
              <TarjetaKpi
                key={indicador.clave ?? indicador.id}
                titulo={indicador.etiqueta}
                valor={formatearValorIndicador(indicador)}
                descripcion={`${indicador.unidad} · Fuente ${etiquetaFuente(
                  indicador.fuente ?? datos.meta.fuente,
                )}`}
                icono={BarChart3}
                acento={ACENTOS_KPI[indice % ACENTOS_KPI.length]}
              />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {indicadores.flatMap((indicador) =>
              agruparDesglose(indicador.desglose).map((grupo) => {
                const clave = `${indicador.clave ?? indicador.id}-${grupo.dimension}`
                const subtitulo = `Por ${etiquetaDimension(grupo.dimension)}`
                const tipo = tipoGraficoCifras(
                  grupo.dimension,
                  indicador.unidad,
                  grupo.puntos.length,
                )

                if (tipo === 'linea') {
                  return (
                    <GraficoLineaCifras
                      key={clave}
                      datos={grupo.puntos}
                      titulo={indicador.etiqueta}
                      subtitulo={subtitulo}
                    />
                  )
                }

                if (tipo === 'dona') {
                  return (
                    <GraficoDistribucion
                      key={clave}
                      datos={grupo.puntos.map((punto, indice) => ({
                        estado: punto.etiqueta,
                        valor: punto.valor,
                        clave: `${clave}-${indice}`,
                      }))}
                      titulo={indicador.etiqueta}
                      subtitulo={subtitulo}
                      totalEtiqueta="Total"
                    />
                  )
                }

                return (
                  <GraficoBarrasCifras
                    key={clave}
                    datos={grupo.puntos}
                    titulo={indicador.etiqueta}
                    subtitulo={subtitulo}
                  />
                )
              }),
            )}
          </div>
        </>
      )}

      <DialogoImportarCifras
        categoriaId={categoriaId}
        categoriaTitulo={categoriaTitulo ?? datos.meta.titulo}
        abierto={dialogoAbierto}
        onAbiertoCambiar={setDialogoAbierto}
        onImportado={() => setVersion((valor) => valor + 1)}
      />
    </div>
  )
}
