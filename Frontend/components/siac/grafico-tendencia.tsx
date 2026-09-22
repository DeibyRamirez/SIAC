'use client'

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const configuracion: ChartConfig = {
  evidencias: { label: 'Evidencias', color: '#0a3b74' },
}

interface GraficoTendenciaProps {
  datos: { mes: string; evidencias: number }[]
  titulo?: string
  subtitulo?: string
}

export function GraficoTendencia({
  datos,
  titulo = 'Tendencia mensual',
  subtitulo = 'Evidencias consolidadas',
}: GraficoTendenciaProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-[10px] font-bold tracking-[0.14em] text-esmeralda uppercase">
          {titulo}
        </p>
        <CardTitle className="text-base">{subtitulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={configuracion} className="h-[240px] w-full">
          <LineChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mes" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="evidencias"
              stroke="var(--color-evidencias)"
              strokeWidth={2}
              dot={{ fill: '#0a3b74', r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
