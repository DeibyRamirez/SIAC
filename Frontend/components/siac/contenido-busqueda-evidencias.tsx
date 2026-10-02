'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  FiltrosBusquedaEvidencias,
  type ValoresFiltrosBusqueda,
} from '@/components/siac/filtros-busqueda-evidencias'
import { ControlesPaginacion } from '@/components/siac/controles-paginacion'
import { TablaEvidencias } from '@/components/siac/tabla-evidencias'
import { EncabezadoPagina, PanelVacio } from '@/components/siac/tarjeta-acceso'
import { Button } from '@/components/ui/button'
import { mapearEvidenciaDesdeApi } from '@/lib/utilidades-siac'
import { LIMITE_FILAS_TABLA } from '@/lib/constantes/paginacion'
import { periodoAcademicoActual } from '@/lib/utilidades/periodo-academico'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  buscarEvidenciasApi,
  type RespuestaBusquedaEvidencias,
} from '@/lib/servicios/busqueda.servicio'
import type { CodigoDocumentoGuia } from '@/lib/tipos'
import { ETIQUETAS_GUIA } from '@/lib/utilidades/catalogo-tramites-siac'
import {
  type FiltrosBusquedaUrl,
  construirQueryBusqueda,
} from '@/lib/utilidades/parametros-busqueda-url'

const CODIGOS_GUIA = Object.keys(ETIQUETAS_GUIA) as CodigoDocumentoGuia[]

function valoresDesdeUrl(filtros: FiltrosBusquedaUrl): ValoresFiltrosBusqueda {
  return {
    busqueda: filtros.q ?? '',
    programa: filtros.programa ?? 'todos',
    codigoGuia: CODIGOS_GUIA.includes(filtros.codigoGuia as CodigoDocumentoGuia)
      ? (filtros.codigoGuia as CodigoDocumentoGuia)
      : 'todos',
    periodo: filtros.periodo ?? periodoAcademicoActual(),
    estado: filtros.estado ?? 'todos',
    puntajeMin: filtros.puntajeMin ?? '',
    puntajeMax: filtros.puntajeMax ?? '',
    semaforo: filtros.semaforo ?? 'todos',
    fechaCargaDesde: filtros.fechaCargaDesde ?? '',
    fechaCargaHasta: filtros.fechaCargaHasta ?? '',
  }
}

function urlDesdeValores(valores: ValoresFiltrosBusqueda, pagina: number): FiltrosBusquedaUrl {
  return {
    q: valores.busqueda.trim() || undefined,
    programa: valores.programa !== 'todos' ? valores.programa : undefined,
    codigoGuia: valores.codigoGuia !== 'todos' ? valores.codigoGuia : undefined,
    periodo: valores.periodo || undefined,
    estado: valores.estado !== 'todos' ? valores.estado : undefined,
    puntajeMin: valores.puntajeMin || undefined,
    puntajeMax: valores.puntajeMax || undefined,
    semaforo: valores.semaforo !== 'todos' ? valores.semaforo : undefined,
    fechaCargaDesde: valores.fechaCargaDesde || undefined,
    fechaCargaHasta: valores.fechaCargaHasta || undefined,
    pagina: pagina > 1 ? String(pagina) : undefined,
  }
}

export function ContenidoBusquedaEvidencias({
  filtrosIniciales,
  datosIniciales,
  rutaDetalle = (id) => `/administrador/evidencias/${id}`,
}: {
  filtrosIniciales: FiltrosBusquedaUrl
  datosIniciales: RespuestaBusquedaEvidencias
  rutaDetalle?: (id: string) => string
}) {
  const router = useRouter()
  const pathname = usePathname()

  const [valores, setValores] = useState(() => valoresDesdeUrl(filtrosIniciales))
  const [pagina, setPagina] = useState(Number(filtrosIniciales.pagina ?? '1') || 1)
  const [evidencias, setEvidencias] = useState(() =>
    datosIniciales.resultados.map((e) => mapearEvidenciaDesdeApi(e)),
  )
  const [total, setTotal] = useState(datosIniciales.total)
  const [cargando, setCargando] = useState(false)

  const filtrosApi = useMemo(() => urlDesdeValores(valores, pagina), [valores, pagina])

  const sincronizarUrl = useCallback(() => {
    const qs = construirQueryBusqueda(filtrosApi)
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [filtrosApi, pathname, router])

  useEffect(() => {
    sincronizarUrl()
  }, [sincronizarUrl])

  const cargar = useCallback(async () => {
    if (!apiDisponible()) return
    setCargando(true)
    try {
      const resp = await buscarEvidenciasApi(filtrosApi, LIMITE_FILAS_TABLA)
      setEvidencias(resp.resultados.map((e) => mapearEvidenciaDesdeApi(e)))
      setTotal(resp.total)
    } finally {
      setCargando(false)
    }
  }, [filtrosApi])

  useEffect(() => {
    const timer = setTimeout(cargar, 300)
    return () => clearTimeout(timer)
  }, [cargar])

  const manejarCambioFiltros = useCallback((parcial: Partial<ValoresFiltrosBusqueda>) => {
    setValores((prev) => ({ ...prev, ...parcial }))
    setPagina(1)
  }, [])

  const limpiarFiltros = useCallback(() => {
    setValores({
      busqueda: '',
      programa: 'todos',
      codigoGuia: 'todos',
      periodo: periodoAcademicoActual(),
      estado: 'todos',
      puntajeMin: '',
      puntajeMax: '',
      semaforo: 'todos',
      fechaCargaDesde: '',
      fechaCargaHasta: '',
    })
    setPagina(1)
    router.replace(pathname, { scroll: false })
  }, [pathname, router])

  const hayFiltrosActivos =
    valores.busqueda.trim() ||
    valores.programa !== 'todos' ||
    valores.codigoGuia !== 'todos' ||
    valores.estado !== 'todos' ||
    valores.puntajeMin ||
    valores.puntajeMax ||
    valores.semaforo !== 'todos' ||
    valores.fechaCargaDesde ||
    valores.fechaCargaHasta

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Gestión documental"
        titulo="Búsqueda de evidencias"
        descripcion="Filtros combinables sincronizados con la URL. Comparte el enlace para reproducir la misma vista (según tu rol)."
      />

      <FiltrosBusquedaEvidencias
        valores={valores}
        onCambiar={manejarCambioFiltros}
        onExportar={() => toast.info('Exportación disponible en backend')}
        onLimpiar={limpiarFiltros}
        mostrarLimpiar={!!hayFiltrosActivos}
      />

      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando evidencias…</p>
      ) : evidencias.length === 0 ? (
        <PanelVacio mensaje="No se encontraron evidencias.">
          {hayFiltrosActivos ? (
            <Button variant="outline" size="sm" className="mt-4" onClick={limpiarFiltros}>
              Limpiar filtros
            </Button>
          ) : null}
        </PanelVacio>
      ) : (
        <>
          <TablaEvidencias
            evidencias={evidencias}
            enlaceDetalle={rutaDetalle}
            mostrarHora
          />
          <ControlesPaginacion
            pagina={pagina}
            limite={LIMITE_FILAS_TABLA}
            total={total}
            onCambiarPagina={setPagina}
          />
        </>
      )}
    </div>
  )
}
