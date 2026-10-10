'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FileText, GraduationCap, TrendingUp } from 'lucide-react'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { GraficoDistribucion } from '@/components/siac/grafico-distribucion'
import { GraficoTendencia } from '@/components/siac/grafico-tendencia'
import { RejillaInformesPowerBi } from '@/components/siac/rejilla-informes-powerbi'
import { TarjetaKpi } from '@/components/siac/tarjeta-kpi'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ROLES_CONSULTA_INSTITUCIONAL } from '@/lib/auth-mock'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { obtenerAvanceInstitucionalApi } from '@/lib/servicios/programas.servicio'
import { promedioAvanceProgramasActivos } from '@/lib/utilidades/avance-institucional'
import {
  calcularDistribucionEstadosAdministrador,
  calcularTendenciaMensual,
  filtrarEvidenciasVisiblesAdministrador,
} from '@/lib/utilidades/metricas-evidencias'

export default function DashboardMetricasPage() {
  return (
    <PlantillaPaginaApp titulo="Dashboard de métricas" roles={ROLES_CONSULTA_INSTITUCIONAL}>
      <ContenidoDashboard />
    </PlantillaPaginaApp>
  )
}

function ContenidoDashboard() {
  const { datos } = usarAlmacen()
  const { evidencias, programas } = datos
  const [avanceInstitucional, setAvanceInstitucional] = useState<number | null>(null)

  useEffect(() => {
    if (!apiDisponible()) return
    obtenerAvanceInstitucionalApi()
      .then((r) => setAvanceInstitucional(r.avanceInstitucional))
      .catch(() => setAvanceInstitucional(null))
  }, [])

  const evidenciasVisibles = useMemo(
    () => filtrarEvidenciasVisiblesAdministrador(evidencias),
    [evidencias],
  )

  const distribucion = useMemo(
    () => calcularDistribucionEstadosAdministrador(evidenciasVisibles),
    [evidenciasVisibles],
  )
  const tendencia = useMemo(
    () => calcularTendenciaMensual(evidenciasVisibles),
    [evidenciasVisibles],
  )

  const validadas = distribucion.find((d) => d.clave === 'validadas')?.valor ?? 0
  const cumplimiento =
    evidenciasVisibles.length > 0
      ? Math.round((validadas / evidenciasVisibles.length) * 1000) / 10
      : null
  const avancePromedio =
    avanceInstitucional ??
    (programas.length > 0 ? promedioAvanceProgramasActivos(programas) : null)
  const pregrado = programas.filter((p) => p.nivel === 'Pregrado').length
  const posgrado = programas.filter((p) => p.nivel === 'Posgrado').length

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        className="mb-0"
        etiqueta="Inteligencia institucional"
        titulo="Dashboard de métricas"
        descripcion="Analiza el comportamiento de la acreditación a partir de las evidencias y programas registrados en SIAC."
      />

      <Tabs
        defaultValue="metricas"
        orientation="horizontal"
        className="flex w-full flex-col gap-4"
      >
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0"
        >
          <TabsTrigger
            value="metricas"
            className="h-auto flex-none px-3 py-2 after:bg-esmeralda data-active:text-primary"
          >
            Métricas SIAC
          </TabsTrigger>
          <TabsTrigger
            value="powerbi"
            className="h-auto flex-none px-3 py-2 after:bg-esmeralda data-active:text-primary"
          >
            Power BI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metricas" className="space-y-6">
          {evidencias.length === 0 && programas.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
              Aún no hay programas ni evidencias registrados. Las métricas se calcularán
              automáticamente a medida que se carguen datos en SIAC.
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TarjetaKpi
              titulo="Cumplimiento institucional"
              valor={cumplimiento === null ? '—' : `${cumplimiento}%`}
              descripcion="Evidencias validadas sobre el total"
              icono={TrendingUp}
            />
            <TarjetaKpi
              titulo="Evidencias en seguimiento"
              valor={evidenciasVisibles.length}
              descripcion={`${validadas} validadas (sin borradores)`}
              icono={FileText}
            />
            <TarjetaKpi
              titulo="Avance promedio"
              valor={avancePromedio === null ? '—' : `${avancePromedio}%`}
              descripcion="Promedio de avance de los programas"
              icono={CheckCircle2}
            />
            <TarjetaKpi
              titulo="Programas en ruta"
              valor={programas.length || '—'}
              descripcion={`${pregrado} pregrado · ${posgrado} posgrado`}
              icono={GraduationCap}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <GraficoTendencia datos={tendencia} />
            <GraficoDistribucion
              datos={distribucion}
              titulo="Resultado global"
              subtitulo="Distribución por estado"
              totalEtiqueta="Total evidencias"
            />
          </div>
        </TabsContent>

        <TabsContent value="powerbi">
          <RejillaInformesPowerBi />
        </TabsContent>
      </Tabs>
    </div>
  )
}
