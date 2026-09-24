'use client'

import { useCallback, useEffect, useState } from 'react'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { BarraHerramientasTabla } from '@/components/siac/barra-herramientas-tabla'
import { ControlesPaginacion } from '@/components/siac/controles-paginacion'
import { TablaEvidencias } from '@/components/siac/tabla-evidencias'
import { EncabezadoPagina, PanelVacio } from '@/components/siac/tarjeta-acceso'
import { LIMITE_FILAS_TABLA } from '@/lib/constantes/paginacion'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { listarEvidenciasApi } from '@/lib/servicios/evidencias.servicio'
import type { Evidencia } from '@/lib/tipos'
import { paginarArreglo } from '@/lib/utilidades/paginacion-cliente'

const INTERVALO_ACTUALIZACION_MS = 30_000

interface ContenidoBandejaRevisionProps {
  etiqueta: string
  titulo: string
  descripcion: string
  enlaceDetalle: (id: string) => string
}

function normalizarFechaCarga(e: Evidencia): Evidencia {
  return {
    ...e,
    fechaCarga:
      typeof e.fechaCarga === 'string'
        ? e.fechaCarga.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
  }
}

export function ContenidoBandejaRevision({
  etiqueta,
  titulo,
  descripcion,
  enlaceDetalle,
}: ContenidoBandejaRevisionProps) {
  const { datos } = usarAlmacen()
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [evidencias, setEvidencias] = useState<Evidencia[]>([])
  const [cargando, setCargando] = useState(true)

  const cargarBandeja = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setCargando(true)
      try {
        const texto = busqueda.trim()

        if (apiDisponible()) {
          const resp = await listarEvidenciasApi({
            estado: 'EnRevision',
            pagina,
            limite: LIMITE_FILAS_TABLA,
            busqueda: texto || undefined,
          })
          const filas = resp.datos.map(normalizarFechaCarga)
          if (filas.length === 0 && pagina > 1 && resp.total > 0) {
            setPagina((p) => Math.max(1, p - 1))
            return
          }
          setEvidencias(filas)
          setTotal(resp.total)
          return
        }

        let lista = datos.evidencias.filter((e) => e.estado === 'EnRevision')
        if (texto) {
          const q = texto.toLowerCase()
          lista = lista.filter(
            (e) =>
              e.nombre.toLowerCase().includes(q) ||
              e.factor.toLowerCase().includes(q) ||
              e.indicador.toLowerCase().includes(q),
          )
        }
        setTotal(lista.length)
        const paginadas = paginarArreglo(lista, pagina, LIMITE_FILAS_TABLA)
        if (paginadas.length === 0 && pagina > 1 && lista.length > 0) {
          setPagina((p) => Math.max(1, p - 1))
          return
        }
        setEvidencias(paginadas)
      } finally {
        if (!silencioso) setCargando(false)
      }
    },
    [busqueda, pagina, datos.evidencias],
  )

  useEffect(() => {
    cargarBandeja()
  }, [cargarBandeja])

  useEffect(() => {
    const id = window.setInterval(() => {
      cargarBandeja(true)
    }, INTERVALO_ACTUALIZACION_MS)
    return () => window.clearInterval(id)
  }, [cargarBandeja])

  useEffect(() => {
    setPagina(1)
  }, [busqueda])

  return (
    <div className="space-y-6">
      <EncabezadoPagina etiqueta={etiqueta} titulo={titulo} descripcion={descripcion} />

      <BarraHerramientasTabla
        placeholder="Buscar en la bandeja…"
        valorBusqueda={busqueda}
        onBuscar={setBusqueda}
      />

      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando bandeja…</p>
      ) : evidencias.length === 0 ? (
        <PanelVacio mensaje="No hay evidencias en revisión en este momento." />
      ) : (
        <>
          <TablaEvidencias evidencias={evidencias} enlaceDetalle={enlaceDetalle} />
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
