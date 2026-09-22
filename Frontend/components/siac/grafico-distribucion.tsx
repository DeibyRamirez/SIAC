'use client'

import { Cell, Pie, PieChart } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const colores = ['#1cbca6', '#0a3b74', '#94a3b8']

interface GraficoDistribucionProps {
  datos: { estado: string; valor: number; clave: string }[]
  titulo?: string
  subtitulo?: string
  totalEtiqueta?: string
}

export function GraficoDistribucion({
  datos,
  titulo = 'Distribución',
  subtitulo = 'Estado de evidencias',
  totalEtiqueta,
}: GraficoDistribucionProps) {
  const total = datos.reduce((suma, item) => suma + item.valor, 0)
  const configuracion: ChartConfig = Object.fromEntries(
    datos.map((item, indice) => [
      item.clave,
      { label: item.estado, color: colores[indice % colores.length] },
    ]),
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-[10px] font-bold tracking-[0.14em] text-esmeralda uppercase">
          {titulo}
        </p>
        <CardTitle className="text-base">{subtitulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 md:flex-row">
          <ChartContainer config={configuracion} className="mx-auto h-[200px] w-[200px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={datos}
                dataKey="valor"
                nameKey="estado"
                innerRadius={55}
                outerRadius={80}
                strokeWidth={2}
              >
                {datos.map((item, indice) => (
                  <Cell key={item.clave} fill={colores[indice % colores.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="space-y-3">
            {totalEtiqueta && (
              <div>
                <p className="text-2xl font-bold text-primary">{total}</p>
                <p className="text-xs text-muted-foreground">{totalEtiqueta}</p>
              </div>
            )}
            {datos.map((item, indice) => (
              <div key={item.clave} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: colores[indice % colores.length] }}
                />
                <span className="text-muted-foreground">{item.estado}</span>
                <span className="font-semibold text-primary">{item.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
