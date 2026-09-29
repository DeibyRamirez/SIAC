'use client'

import { Landmark } from 'lucide-react'

import { DetalleProgresoTramite } from '@/components/siac/panel-avance-etapas-siac'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProgresoProcesoSIAC } from '@/lib/servicios/progreso-programa.servicio'
import type { Institucion } from '@/lib/tipos'

interface PanelAvanceInstitucionalProps {
  institucion: Institucion | null
  progreso: ProgresoProcesoSIAC | null
  cargando?: boolean
}

/**
 * HU-010: avance del trámite de condiciones institucionales (G3 y, en renovación, G4).
 * No depende de ningún programa: los documentos pertenecen a la institución (CUAC).
 */
export function PanelAvanceInstitucional({
  institucion,
  progreso,
  cargando,
}: PanelAvanceInstitucionalProps) {
  return (
    <Card className="tarjeta-institucional">
      <CardHeader className="pb-3">
        <p className="text-[10px] font-bold tracking-[0.14em] text-esmeralda uppercase">
          Condiciones institucionales
        </p>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Landmark className="size-5 text-primary" aria-hidden />
          {institucion ? `${institucion.nombre} (${institucion.sigla})` : 'Institución'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Documento maestro institucional (G3) y respaldo de mejoramiento institucional (G4).
          Estos documentos no se atribuyen a ninguna carrera.
        </p>

        {cargando && (
          <p className="text-sm text-muted-foreground">Calculando avance institucional…</p>
        )}

        {!cargando && !progreso && (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No se pudo consultar el avance institucional.
          </p>
        )}

        {!cargando && progreso && (
          <DetalleProgresoTramite progreso={progreso} ambito="institucion" />
        )}
      </CardContent>
    </Card>
  )
}
