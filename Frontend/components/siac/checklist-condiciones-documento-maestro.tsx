'use client'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  CONDICIONES_DOCUMENTO_MAESTRO,
  PESO_POR_CONDICION_DOCUMENTO_MAESTRO,
  type CodigoCondicionDocumentoMaestro,
} from '@/lib/condiciones-documento-maestro'
import { cn } from '@/lib/utils'

export type DecisionCondicion = 'correcto' | 'corregir' | null

export interface EstadoCondicionDictamen {
  codigo: CodigoCondicionDocumentoMaestro
  decision: DecisionCondicion
  observacion: string
}

interface ChecklistCondicionesDocumentoMaestroProps {
  estados: EstadoCondicionDictamen[]
  onChange: (estados: EstadoCondicionDictamen[]) => void
  deshabilitado?: boolean
}

export function crearEstadosCondicionIniciales(): EstadoCondicionDictamen[] {
  return CONDICIONES_DOCUMENTO_MAESTRO.map((c) => ({
    codigo: c.codigo,
    decision: null,
    observacion: '',
  }))
}

export function condicionCumpleParaApi(estado: EstadoCondicionDictamen): boolean {
  return estado.decision === 'correcto'
}

export function ChecklistCondicionesDocumentoMaestro({
  estados,
  onChange,
  deshabilitado = false,
}: ChecklistCondicionesDocumentoMaestroProps) {
  function actualizar(
    codigo: CodigoCondicionDocumentoMaestro,
    cambios: Partial<EstadoCondicionDictamen>,
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
        Cada condición aporta ~{PESO_POR_CONDICION_DOCUMENTO_MAESTRO.toFixed(2)}%
        al avance del documento (9 condiciones = 100%).
      </p>
      <ul className="max-h-[min(520px,60vh)] space-y-3 overflow-y-auto pr-1">
        {CONDICIONES_DOCUMENTO_MAESTRO.map((def) => {
          const estado = estados.find((e) => e.codigo === def.codigo)
          if (!estado) return null
          return (
            <li
              key={def.codigo}
              className="rounded-lg border border-border/80 bg-card p-3"
            >
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
                      ? 'border-esmeralda bg-esmeralda text-white hover:bg-esmeralda/90 hover:text-white'
                      : 'border-esmeralda/40 bg-white text-primary hover:border-esmeralda hover:bg-esmeralda/10',
                  )}
                  onClick={() =>
                    actualizar(def.codigo, { decision: 'correcto', observacion: '' })
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
                      ? 'border-fucsia bg-fucsia text-white hover:bg-fucsia/90 hover:text-white'
                      : 'border-fucsia/40 bg-white text-primary hover:border-fucsia hover:bg-fucsia/10',
                  )}
                  onClick={() => actualizar(def.codigo, { decision: 'corregir' })}
                >
                  Corregir
                </Button>
              </div>
              {estado.decision === 'corregir' && (
                <Textarea
                  className="mt-2 min-h-[72px] text-sm"
                  placeholder="Observaciones para el cargador (obligatorio si debe corregir)."
                  value={estado.observacion}
                  disabled={deshabilitado}
                  onChange={(e) =>
                    actualizar(def.codigo, { observacion: e.target.value })
                  }
                />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
