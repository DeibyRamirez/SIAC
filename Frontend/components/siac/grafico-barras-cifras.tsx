'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PuntoSerieCifras } from '@/lib/tipos/cifras'

const configuracion: ChartConfig = {
  valor: { label: 'Valor', color: '#0a3b74' },
}

interface GraficoBarrasCifrasProps {
  datos: PuntoSerieCifras[]
  titulo: string
  subtitulo?: string
}

export function GraficoBarrasCifras({ datos, titulo, subtitulo }: GraficoBarrasCifrasProps) {
  const filas = datos.map((punto) => ({
    etiqueta: punto.etiqueta,
    valor: punto.valor,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-[10px] font-bold tracking-[0.14em] text-esmeralda uppercase">
          {titulo}
        </p>
        {subtitulo ? <CardTitle className="text-base">{subtitulo}</CardTitle> : null}
      </CardHeader>
      <CardContent>
        <ChartContainer config={configuracion} className="h-[240px] w-full">
          <BarChart data={filas} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="etiqueta"
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={{ fontSize: 11 }}
            />
            <YAxis tickLine={false} axisLine={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="valor" fill="var(--color-valor)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
