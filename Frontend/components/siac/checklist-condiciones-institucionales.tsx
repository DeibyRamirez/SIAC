'use client'

import { Button } from '@/components/ui/button'
import { TextareaConContador } from '@/components/siac/textarea-con-contador'
import {
  CONDICIONES_INSTITUCIONALES,
  type CodigoCondicionInstitucional,
} from '@/lib/condiciones-institucionales'
import { cn } from '@/lib/utils'

export type DecisionCondicionInstitucional = 'correcto' | 'corregir' | null

export interface EstadoCondicionInstitucionalDictamen {
  codigo: CodigoCondicionInstitucional
  decision: DecisionCondicionInstitucional
  observacion: string
}

interface ChecklistCondicionesInstitucionalesProps {
  estados: EstadoCondicionInstitucionalDictamen[]
  onChange: (estados: EstadoCondicionInstitucionalDictamen[]) => void
  deshabilitado?: boolean
  /** T-006.1: códigos con «Corregir» sin observación; marca el campo en rojo. */
  codigosConError?: string[]
}

export function crearEstadosCondicionInstitucionalIniciales(): EstadoCondicionInstitucionalDictamen[] {
  return CONDICIONES_INSTITUCIONALES.map((c) => ({
    codigo: c.codigo,
    decision: null,
    observacion: '',
  }))
}

export function condicionInstitucionalCumpleParaApi(
  estado: EstadoCondicionInstitucionalDictamen,
): boolean {
  return estado.decision === 'correcto'
}

export function ChecklistCondicionesInstitucionales({
  estados,
  onChange,
  deshabilitado = false,
  codigosConError = [],
}: ChecklistCondicionesInstitucionalesProps) {
  function actualizar(
    codigo: CodigoCondicionInstitucional,
    cambios: Partial<EstadoCondicionInstitucionalDictamen>,
  ) {
    onChange(
      estados.map((item) =>
        item.codigo === codigo ? { ...item, ...cambios } : item,
      ),
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Calificación binaria: cada condición cumple o no cumple. El puntaje es el
        número de condiciones que cumplen (n/6); 6/6 deja el documento en «Cumple» y
        menos de 6 en «Con observaciones». Incluye informe de autoevaluación y plan de
        desarrollo (art. 2.5.3.2.3.1.8).
      </p>
      <ul className="max-h-[min(520px,60vh)] space-y-3 overflow-y-auto pr-1">
        {CONDICIONES_INSTITUCIONALES.map((def) => {
          const estado = estados.find((e) => e.codigo === def.codigo)
          if (!estado) return null
          return (
            <li
              key={def.codigo}
              className="rounded-lg border border-border/80 bg-card p-3"
            >
              <p className="text-xs text-muted-foreground">{def.articulo}</p>
              <p className="text-sm font-medium leading-snug text-primary">
                {def.etiqueta}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={deshabilitado}
                  aria-pressed={estado.decision === 'correcto'}
                  className={cn(
                    'min-w-[6.5rem] border-2 font-semibold shadow-none',
                    estado.decision === 'correcto'
                      ? 'border-esmeralda bg-esmeralda/10 text-esmeralda'
                      : 'border-border',
                  )}
                  onClick={() =>
                    actualizar(def.codigo, {
                      decision: 'correcto',
                      observacion: '',
                    })
                  }
                >
                  Correcto
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={deshabilitado}
                  aria-pressed={estado.decision === 'corregir'}
                  className={cn(
                    'min-w-[6.5rem] border-2 font-semibold shadow-none',
                    estado.decision === 'corregir'
                      ? 'border-destructive bg-destructive/10 text-destructive'
                      : 'border-border',
                  )}
                  onClick={() =>
                    actualizar(def.codigo, { decision: 'corregir' })
                  }
                >
                  Corregir
                </Button>
              </div>
              {estado.decision === 'corregir' && (
                <>
                  <TextareaConContador
                    className={cn(
                      'mt-3',
                      codigosConError.includes(def.codigo) &&
                        'border-destructive ring-2 ring-destructive/30',
                    )}
                    placeholder="Observación para el profesor"
                    value={estado.observacion}
                    disabled={deshabilitado}
                    aria-invalid={codigosConError.includes(def.codigo) || undefined}
                    aria-describedby={
                      codigosConError.includes(def.codigo)
                        ? `error-condicion-institucional-${def.codigo}`
                        : undefined
                    }
                    onChange={(e) =>
                      actualizar(def.codigo, { observacion: e.target.value })
                    }
                  />
                  {codigosConError.includes(def.codigo) && (
                    <p
                      id={`error-condicion-institucional-${def.codigo}`}
                      className="mt-1 text-xs font-medium text-destructive"
                    >
                      Registra una observación para esta condición.
                    </p>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
