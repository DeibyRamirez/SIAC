'use client'

import { AlertTriangle } from 'lucide-react'

import { Semaforo } from '@/components/siac/insignia-estado'
import { Progress } from '@/components/ui/progress'
import {
  calcularPorcentajeVigencia,
  calcularSemaforoVigencia,
  etiquetaAniosVigencia,
  mensajeAlertaVigencia,
} from '@/lib/utilidades/vigencia-registro'

interface BarraVigenciaRegistroProps {
  fechaResolucion: string
  nombreEntidad: string
}

export function BarraVigenciaRegistro({ fechaResolucion, nombreEntidad }: BarraVigenciaRegistroProps) {
  const porcentaje = calcularPorcentajeVigencia(fechaResolucion)
  const semaforo = calcularSemaforoVigencia(fechaResolucion)
  const etiqueta = etiquetaAniosVigencia(fechaResolucion)
  const alerta = mensajeAlertaVigencia(fechaResolucion, nombreEntidad)

  return (
    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-primary">Vigencia de registro (7 años)</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{etiqueta}</span>
          <Semaforo valor={semaforo} etiqueta="Vigencia" />
        </div>
      </div>
      <Progress value={porcentaje} className="h-3" />
      <p className="text-xs text-muted-foreground">
        {porcentaje}% del periodo de vigencia transcurrido desde la resolución.
      </p>
      {alerta ? (
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
            semaforo === 'Rojo'
              ? 'border-fucsia/40 bg-fucsia/10 text-fucsia'
              : 'border-ocre/40 bg-ocre/10 text-ocre'
          }`}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{alerta}</span>
        </div>
      ) : null}
    </div>
  )
}
