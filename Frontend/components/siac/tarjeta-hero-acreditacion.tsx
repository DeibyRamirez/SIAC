import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Progress } from '@/components/ui/progress'

interface TarjetaHeroAcreditacionProps {
  avance: number
  evidenciasValidadas: number
  evidenciasEnProceso: number
}

export function TarjetaHeroAcreditacion({
  avance,
  evidenciasValidadas,
  evidenciasEnProceso,
}: TarjetaHeroAcreditacionProps) {
  return (
    <div className="tarjeta-hero-institucional p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl space-y-3">
          <p className="text-[11px] font-bold tracking-[0.14em] text-esmeralda uppercase">
            Ruta de acreditación
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            Ruta de acreditación en marcha
          </h2>
          <p className="text-sm text-white/90">
            La institución consolida evidencias para la renovación del registro calificado según
            el Decreto 1330 de 2019.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="rounded-xl bg-white/15 px-4 py-2 backdrop-blur-sm">
              <p className="text-white/80">Evidencias validadas</p>
              <p className="text-2xl font-extrabold text-white">{evidenciasValidadas}</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-2 backdrop-blur-sm">
              <p className="text-white/80">En proceso</p>
              <p className="text-2xl font-extrabold text-white">{evidenciasEnProceso}</p>
            </div>
          </div>
          <Link
            href="/administrador/programas"
            className="inline-flex items-center gap-1 rounded-full bg-black px-4 py-2 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-white/90"
          >
            Ver avance por programa
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="relative flex size-32 items-center justify-center rounded-full border-4 border-esmeralda/50 bg-white/10 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-4xl font-extrabold text-white">{avance}%</p>
              <p className="text-xs text-white/80">Avance general</p>
            </div>
          </div>
          <Progress value={avance} className="h-2.5 w-36 bg-white/25" />
        </div>
      </div>
    </div>
  )
}
