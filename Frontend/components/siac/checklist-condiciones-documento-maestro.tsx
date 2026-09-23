'use client'

import { Textarea } from '@/components/ui/textarea'
import {
  CONDICIONES_DOCUMENTO_MAESTRO,
  PESO_POR_CONDICION_DOCUMENTO_MAESTRO,
  type CodigoCondicionDocumentoMaestro,
} from '@/lib/condiciones-documento-maestro'

export interface EstadoCondicionDictamen {
  codigo: CodigoCondicionDocumentoMaestro
  cumple: boolean
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
    cumple: false,
    observacion: '',
  }))
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
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={estado.cumple}
                  disabled={deshabilitado}
                  onChange={(e) =>
                    actualizar(def.codigo, { cumple: e.target.checked })
                  }
                  className="mt-1 size-4 rounded border-input accent-primary"
                />
                <span className="text-sm font-medium leading-snug text-primary">
                  {def.etiqueta}
                </span>
              </label>
              {!estado.cumple && (
                <Textarea
                  className="mt-2 min-h-[72px] text-sm"
                  placeholder="Observaciones para el cargador (obligatorio si no cumple)."
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
