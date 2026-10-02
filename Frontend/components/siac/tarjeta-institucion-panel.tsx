'use client'

import Link from 'next/link'
import { Building2, ArrowRight } from 'lucide-react'

import { Semaforo } from '@/components/siac/insignia-estado'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { FilaPanelPrograma } from '@/lib/servicios/panel-programas.servicio'

interface TarjetaInstitucionPanelProps {
  institucion: FilaPanelPrograma
  enlaceDetalle?: string
}

export function TarjetaInstitucionPanel({
  institucion,
  enlaceDetalle = '/administrador/programas/institucion',
}: TarjetaInstitucionPanelProps) {
  return (
    <Card className="tarjeta-institucional borde-institucional overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 to-accent/30">
      <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="size-7" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="titulo-institucional text-[10px] font-bold text-esmeralda">
              Institución · Proceso principal
            </p>
            <h2 className="text-xl font-bold text-primary">{institucion.nombre}</h2>
            <p className="text-sm text-muted-foreground">
              Renovación de condiciones institucionales (G3 + G4)
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Semaforo valor={institucion.semaforoGeneral} etiqueta="General" />
              <Semaforo valor={institucion.semaforoAvance} etiqueta="Avance" />
              <Semaforo valor={institucion.semaforoVigencia} etiqueta="Vigencia" />
            </div>
          </div>
        </div>

        <div className="w-full space-y-3 lg:max-w-md">
          {institucion.documentos.map((doc) => (
            <div key={doc.codigoGuia} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-primary">{doc.codigoGuia}</span>
                <span className="font-semibold text-esmeralda">{doc.porcentajeInterno}%</span>
              </div>
              <Progress value={doc.porcentajeInterno} className="h-2" />
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-primary/10 pt-2 text-sm">
            <span className="text-muted-foreground">Avance institucional</span>
            <span className="font-bold text-esmeralda">{institucion.avancePorcentual}%</span>
          </div>
        </div>

        <Link href={enlaceDetalle} className="shrink-0">
          <Button className="gap-2">
            Ver proceso institucional
            <ArrowRight className="size-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
