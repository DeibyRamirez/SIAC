'use client'

import { useEffect, useMemo, useState } from 'react'
import { GraduationCap, Layers, Percent, UserPlus } from 'lucide-react'

import { GraficoBarrasCifras } from '@/components/siac/grafico-barras-cifras'
import { GraficoDistribucion } from '@/components/siac/grafico-distribucion'
import { GraficoTendencia } from '@/components/siac/grafico-tendencia'
import { TarjetaKpi } from '@/components/siac/tarjeta-kpi'
import { Button } from '@/components/ui/button'
import { obtenerCifrasEstudiantesApi } from '@/lib/servicios/cifras.servicio'
import type { IndicadorCifras, RespuestaCifras, SerieCifras } from '@/lib/tipos/cifras'

const ICONOS_INDICADOR: Record<string, typeof GraduationCap> = {
  total_matriculados: GraduationCap,
  nuevos_ingresos: UserPlus,
  tasa_permanencia: Percent,
  programas_con_matricula: Layers,
}

function formatearValorIndicador(indicador: IndicadorCifras): string {
  if (typeof indicador.valor === 'string') {
    return indicador.valor
  }
  switch (indicador.formato) {
    case 'porcentaje':
      return `${indicador.valor}%`
    case 'decimal':
      return indicador.valor.toLocaleString('es-CO', { maximumFractionDigits: 1 })
    case 'entero':
      return indicador.valor.toLocaleString('es-CO')
    default:
      return String(indicador.valor)
  }
}

function serieADistribucion(serie: SerieCifras) {
  return serie.puntos.map((punto, indice) => ({
    estado: punto.etiqueta,
    valor: punto.valor,
    clave: `${serie.id}-${indice}`,
  }))
}

function serieATendencia(serie: SerieCifras) {
  return serie.puntos.map((punto) => ({
    mes: punto.etiqueta,
    evidencias: punto.valor,
  }))
}

interface PanelCifrasEstudiantesProps {
  periodo?: string
  mensajeEncabezado?: string
}

export function PanelCifrasEstudiantes({
  periodo,
  mensajeEncabezado,
}: PanelCifrasEstudiantesProps) {
  const [datos, setDatos] = useState<RespuestaCifras | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargar = () => {
    setCargando(true)
    setError(null)
    obtenerCifrasEstudiantesApi(periodo)
      .then(setDatos)
      .catch((err: Error) => {
        setDatos(null)
        setError(err.message ?? 'No fue posible cargar las cifras de estudiantes.')
      })
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
  }, [periodo])

  const seriesPorTipo = useMemo(() => {
    if (!datos) {
      return { linea: [] as SerieCifras[], donut: [] as SerieCifras[], barra: [] as SerieCifras[] }
    }
    return {
      linea: datos.series.filter((s) => s.tipo === 'linea'),
      donut: datos.series.filter((s) => s.tipo === 'donut'),
      barra: datos.series.filter((s) => s.tipo === 'barra'),
    }
  }, [datos])

  if (cargando) {
    return (
      <div
        className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Cargando cifras de estudiantes…
      </div>
    )
  }

  if (error || !datos) {
    return (
      <div className="space-y-4 rounded-xl border bg-white p-6">
        <p className="text-sm text-destructive">{error ?? 'Sin datos disponibles.'}</p>
        <Button type="button" onClick={cargar}>
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {mensajeEncabezado ? (
        <p className="rounded-lg border border-esmeralda/30 bg-esmeralda/5 px-4 py-3 text-sm text-muted-foreground">
          {mensajeEncabezado}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          Periodo {datos.meta.periodo} · Fuente {datos.meta.fuente}
        </span>
        <span>Actualizado {new Date(datos.meta.actualizadoEn).toLocaleDateString('es-CO')}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {datos.indicadores.map((indicador, indice) => {
          const Icono = ICONOS_INDICADOR[indicador.id] ?? GraduationCap
          const acentos = ['esmeralda', 'cyan', 'ocre', 'purpura'] as const
          return (
            <TarjetaKpi
              key={indicador.id}
              titulo={indicador.etiqueta}
              valor={formatearValorIndicador(indicador)}
              descripcion={indicador.unidad}
              icono={Icono}
              acento={acentos[indice % acentos.length]}
            />
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {seriesPorTipo.linea.map((serie) => (
          <GraficoTendencia
            key={serie.id}
            datos={serieATendencia(serie)}
            titulo={serie.titulo}
            subtitulo={serie.subtitulo ?? serie.titulo}
          />
        ))}
        {seriesPorTipo.donut.map((serie) => (
          <GraficoDistribucion
            key={serie.id}
            datos={serieADistribucion(serie)}
            titulo={serie.titulo}
            subtitulo={serie.subtitulo ?? serie.titulo}
            totalEtiqueta="Total"
          />
        ))}
      </div>

      {seriesPorTipo.barra.map((serie) => (
        <GraficoBarrasCifras
          key={serie.id}
          datos={serie.puntos}
          titulo={serie.titulo}
          subtitulo={serie.subtitulo}
        />
      ))}
    </div>
  )
}
