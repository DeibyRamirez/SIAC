'use client'

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PuntoSerieCifras } from '@/lib/tipos/cifras'

const configuracion: ChartConfig = {
  valor: { label: 'Valor', color: 'var(--color-chart-3)' },
}

interface GraficoLineaCifrasProps {
  datos: PuntoSerieCifras[]
  titulo: string
  subtitulo?: string
}

export function GraficoLineaCifras({ datos, titulo, subtitulo }: GraficoLineaCifrasProps) {
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
          <LineChart data={filas} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="valor"
              stroke="var(--color-valor)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
