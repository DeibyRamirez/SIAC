'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, FlaskConical } from 'lucide-react'

import { Semaforo } from '@/components/siac/insignia-estado'
import type { EstadoVigencia, SemaforoVigencia } from '@/lib/tipos'
import {
  DURACION_DEMO_VIGENCIA_MS,
  calcularPorcentajeVigencia,
  calcularReferenciaDemoVigencia,
  calcularSemaforoVigencia,
  demoVigenciaFinalizada,
  etiquetaAniosVigencia,
  fraccionDemoVigenciaTranscurrida,
  mensajeAlertaVigencia,
} from '@/lib/utilidades/vigencia-registro'

function semaforoAEstadoVigencia(semaforo: SemaforoVigencia): EstadoVigencia {
  if (semaforo === 'Amarillo') return 'Proximo'
  if (semaforo === 'Rojo') return 'Vencido'
  return 'Vigente'
}

function formatearTiempoRestante(msRestante: number): string {
  const totalSeg = Math.max(0, Math.ceil(msRestante / 1000))
  const min = Math.floor(totalSeg / 60)
  const seg = totalSeg % 60
  return `${min}:${seg.toString().padStart(2, '0')}`
}

interface BarraVigenciaRegistroDemoProps {
  fechaResolucion: string
  nombreEntidad: string
  inicioDemoMs: number
}

export function BarraVigenciaRegistroDemo({
  fechaResolucion,
  nombreEntidad,
  inicioDemoMs,
}: BarraVigenciaRegistroDemoProps) {
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const referencia = calcularReferenciaDemoVigencia(fechaResolucion, inicioDemoMs, ahora)
  const porcentaje = calcularPorcentajeVigencia(fechaResolucion, referencia)
  const semaforo = calcularSemaforoVigencia(fechaResolucion, referencia)
  const estadoBarra = semaforoAEstadoVigencia(semaforo)
  const etiqueta = etiquetaAniosVigencia(fechaResolucion, referencia)
  const alerta = mensajeAlertaVigencia(fechaResolucion, nombreEntidad, referencia)
  const fraccion = fraccionDemoVigenciaTranscurrida(inicioDemoMs, ahora)
  const finalizada = demoVigenciaFinalizada(inicioDemoMs, ahora)
  const msRestante = DURACION_DEMO_VIGENCIA_MS - (ahora - inicioDemoMs)

  const colorProgreso =
    estadoBarra === 'Vencido'
      ? 'bg-fucsia'
      : estadoBarra === 'Proximo'
        ? 'bg-ocre'
        : 'bg-esmeralda'

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-cyan-tecnico/50 bg-cyan-tecnico/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <FlaskConical className="mt-0.5 size-4 shrink-0 text-cyan-tecnico" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-primary">
              Simulación de prueba (7 minutos = 7 años)
            </p>
            <p className="text-xs text-muted-foreground">
              No modifica la base de datos ni el cron de vigencias. Referencia simulada:{' '}
              {referencia.toISOString().slice(0, 10)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {finalizada
              ? 'Prueba finalizada'
              : `Tiempo demo: ${formatearTiempoRestante(msRestante)} · ${Math.round(fraccion * 100)}%`}
          </span>
          <Semaforo valor={semaforo === 'SinVigencia' ? 'Verde' : semaforo} contexto="vigenciaRegistro" etiqueta="Simulación" />
        </div>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorProgreso}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {porcentaje}% del periodo de vigencia (simulado) · {etiqueta}
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
