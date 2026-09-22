'use client'

import { TrendingDown, TrendingUp } from 'lucide-react'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { GraficoDistribucion } from '@/components/siac/grafico-distribucion'
import { GraficoTendencia } from '@/components/siac/grafico-tendencia'
import { RejillaInformesPowerBi } from '@/components/siac/rejilla-informes-powerbi'
import { TarjetaKpi } from '@/components/siac/tarjeta-kpi'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  distribucionEstadosSemilla,
  resumenInstitucionalSemilla,
  tarjetasResumenSemilla,
  tendenciaMensualSemilla,
} from '@/lib/datos-semilla'
import { ROLES_CONSULTA_INSTITUCIONAL } from '@/lib/auth-mock'
import { informesPowerBiSemilla } from '@/lib/informes-powerbi'
import Image from 'next/image'

export default function DashboardMetricasPage() {
  return (
    <PlantillaPaginaApp titulo="Dashboard de métricas" roles={ROLES_CONSULTA_INSTITUCIONAL}>
      <ContenidoDashboard />
    </PlantillaPaginaApp>
  )
}

function ContenidoDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <EncabezadoPagina
          className="mb-0"
          etiqueta="Inteligencia institucional"
          titulo="Dashboard de métricas"
          descripcion="Analiza el comportamiento de la acreditación y compara ciclos de autoevaluación."
        />
        <Select defaultValue="2021-2023">
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2021-2023">2021 — 2023</SelectItem>
            <SelectItem value="2024-2026">2024 — 2026</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
          <div className="grid gap-4 md:grid-cols-3">
            {tarjetasResumenSemilla.map((tarjeta) => (
              <Card key={tarjeta.id} className="overflow-hidden border-l-4 border-primary">
                <div className="relative aspect-video w-full bg-accent">
                  {tarjeta.urlImagen && (
                    <Image
                      src={tarjeta.urlImagen}
                      alt={tarjeta.titulo}
                      fill
                      className="object-cover opacity-90"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  )}
                </div>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground uppercase">{tarjeta.titulo}</p>
                  <p className="mt-2 text-3xl font-bold text-primary">{tarjeta.valor}</p>
                  {tarjeta.detalle && (
                    <p className="text-xs text-muted-foreground">{tarjeta.detalle}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {informesPowerBiSemilla.map((cat) => (
              <Card key={cat.id} className="overflow-hidden border-l-4 border-esmeralda">
                <div className="relative aspect-[4/3] w-full bg-accent">
                  {cat.urlImagen && (
                    <Image
                      src={cat.urlImagen}
                      alt={cat.titulo}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  )}
                </div>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-primary">{cat.titulo}</p>
                  <p className="text-xs text-muted-foreground">{cat.descripcion}</p>
                  <p className="mt-2 text-lg font-bold text-esmeralda">{cat.valor} / 5</p>
                </CardContent>
              </Card>
            ))}
          </div> */}

          <p className="text-xs text-muted-foreground">
            Datos consolidados de SIAC · Última sincronización: hoy, 08:42
          </p>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TarjetaKpi
              titulo="Cumplimiento institucional"
              valor={`${resumenInstitucionalSemilla.cumplimientoInstitucional}%`}
              tendencia={{ valor: '↑ 2.3% frente al ciclo anterior', positiva: true }}
              icono={TrendingUp}
            />
            <TarjetaKpi titulo="Promedio de condiciones" valor="4.2 / 5" descripcion="6 condiciones evaluadas" />
            <TarjetaKpi
              titulo="Tiempo medio de aplicación"
              valor="3.8 días"
              tendencia={{ valor: '↓ 1.2 días este trimestre', positiva: true }}
              icono={TrendingDown}
            />
            <TarjetaKpi titulo="Programas en ruta" valor="12" descripcion="5 con visita próxima" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <GraficoTendencia datos={tendenciaMensualSemilla} />
            <GraficoDistribucion
              datos={distribucionEstadosSemilla}
              titulo="Resultado global"
              subtitulo="Distribución por estado"
              totalEtiqueta="81% cumplimiento"
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
