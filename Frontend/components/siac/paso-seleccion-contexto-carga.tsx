'use client'

import { Building2, GraduationCap } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Programa } from '@/lib/tipos'

export type ContextoCargaEvidencia = 'programa' | 'institucion'

interface PasoSeleccionContextoCargaProps {
  contexto: ContextoCargaEvidencia | null
  onContextoChange: (valor: ContextoCargaEvidencia) => void
  programaId: string
  onProgramaChange: (id: string) => void
  programas: Programa[]
  permitirInstitucion: boolean
  soloInstitucion: boolean
}

export function PasoSeleccionContextoCarga({
  contexto,
  onContextoChange,
  programaId,
  onProgramaChange,
  programas,
  permitirInstitucion,
  soloInstitucion,
}: PasoSeleccionContextoCargaProps) {
  const mostrarEleccionProgramaEInstitucion =
    programas.length > 0 && permitirInstitucion && !soloInstitucion

  const tarjetaInstitucional = (
    <button
      type="button"
      onClick={() => onContextoChange('institucion')}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors',
        contexto === 'institucion'
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/40',
      )}
    >
      <Building2 className="size-5 shrink-0 text-primary" aria-hidden />
      <span>
        <span className="block text-sm font-semibold text-primary">Trámite institucional</span>
        <span className="block text-xs text-muted-foreground">
          Condiciones institucionales según el trámite activo de la IES (G3 / G4).
        </span>
      </span>
    </button>
  )

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Paso 1</Badge>
        <h3 className="text-sm font-semibold text-primary">
          ¿Para qué programa o trámite va a cargar la evidencia?
        </h3>
      </div>

      {mostrarEleccionProgramaEInstitucion ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onContextoChange('programa')}
            className={cn(
              'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors',
              contexto === 'programa'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40',
            )}
          >
            <GraduationCap className="size-5 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="block text-sm font-semibold text-primary">Programa académico</span>
              <span className="block text-xs text-muted-foreground">
                Registro calificado o renovación de una carrera asignada (G1 / G2).
              </span>
            </span>
          </button>
          {tarjetaInstitucional}
        </div>
      ) : null}

      {soloInstitucion && permitirInstitucion ? tarjetaInstitucional : null}

      {contexto === 'programa' && programas.length > 0 ? (
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Programa</span>
          <select
            value={programaId}
            onChange={(e) => onProgramaChange(e.target.value)}
            className="w-full rounded-lg border border-input px-3 py-2"
          >
            {programas.map((programa) => (
              <option key={programa.id} value={programa.id}>
                {programa.nombre}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {contexto === 'institucion' && permitirInstitucion ? (
        <p className="rounded-lg border border-cyan-tecnico/30 bg-cyan-tecnico/5 px-3 py-2 text-sm text-muted-foreground">
          Cargará evidencias del <strong className="text-foreground">proceso institucional</strong>{' '}
          asignado por el administrador (renovación o trámite nuevo según la IES).
        </p>
      ) : null}
    </section>
  )
}
