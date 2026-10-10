'use client'

import { Building2, FileCheck, GraduationCap, RefreshCw, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  DESCRIPCIONES_GUIA,
  ETIQUETAS_GUIA,
  etiquetaAlcance,
  etiquetaModalidad,
  tramiteDesdeSeleccion,
  type AlcanceTramiteUI,
  type CodigoDocumentoGuia,
  type ModalidadTramiteUI,
} from '@/lib/utilidades/catalogo-tramites-siac'

interface OpcionTarjetaProps {
  seleccionado: boolean
  titulo: string
  descripcion: string
  icono: React.ReactNode
  onClick: () => void
}

function OpcionTarjeta({
  seleccionado,
  titulo,
  descripcion,
  icono,
  onClick,
}: OpcionTarjetaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors',
        seleccionado
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40',
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg',
          seleccionado ? 'bg-primary text-primary-foreground' : 'bg-muted text-primary',
        )}
      >
        {icono}
      </span>
      <span className="min-w-0 space-y-1">
        <span className="block text-sm font-semibold text-primary">{titulo}</span>
        <span className="block text-xs leading-relaxed text-muted-foreground">
          {descripcion}
        </span>
      </span>
    </button>
  )
}

interface SelectorTramiteCargaEvidenciaProps {
  modalidad: ModalidadTramiteUI | null
  alcance: AlcanceTramiteUI | null
  codigoGuia: CodigoDocumentoGuia | null
  onModalidadChange: (valor: ModalidadTramiteUI) => void
  onAlcanceChange: (valor: AlcanceTramiteUI) => void
  onCodigoGuiaChange: (valor: CodigoDocumentoGuia) => void
  /** Si el programa ya tiene trámite activo, no se eligen pasos 1–2 manualmente. */
  tramiteBloqueado?: boolean
  /** Si el usuario puede cargar el proceso institucional (G3/G4) asignado por el administrador. */
  permitirAlcanceInstitucion?: boolean
}

export function SelectorTramiteCargaEvidencia({
  modalidad,
  alcance,
  codigoGuia,
  onModalidadChange,
  onAlcanceChange,
  onCodigoGuiaChange,
  tramiteBloqueado = false,
  permitirAlcanceInstitucion = false,
}: SelectorTramiteCargaEvidenciaProps) {
  const tramite =
    modalidad && alcance ? tramiteDesdeSeleccion(alcance, modalidad) : null
  const documentosDisponibles = tramite?.documentosGuia ?? []

  return (
    <div className="space-y-6">
      {tramiteBloqueado && tramite ? (
        <p className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Trámite del programa: <strong className="text-foreground">{tramite.nombre}</strong>
          {' · '}
          {etiquetaModalidad(modalidad!)} · {etiquetaAlcance(alcance!)}
        </p>
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Paso 1</Badge>
              <h3 className="text-sm font-semibold text-primary">
                ¿Es trámite nuevo o renovación?
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <OpcionTarjeta
                seleccionado={modalidad === 'Nuevo'}
                titulo="Trámite nuevo"
                descripcion="Primera radicación: registro calificado nuevo o condiciones institucionales nuevas."
                icono={<Sparkles className="size-5" aria-hidden />}
                onClick={() => onModalidadChange('Nuevo')}
              />
              <OpcionTarjeta
                seleccionado={modalidad === 'Renovacion'}
                titulo="Renovación"
                descripcion="Renovación de registro calificado o de condiciones institucionales (incluye respaldos de mejoramiento)."
                icono={<RefreshCw className="size-5" aria-hidden />}
                onClick={() => onModalidadChange('Renovacion')}
              />
            </div>
          </section>

          {modalidad && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Paso 2</Badge>
                <h3 className="text-sm font-semibold text-primary">
                  ¿El documento es de programa o de institución?
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <OpcionTarjeta
                  seleccionado={alcance === 'Programa'}
                  titulo="Programa académico"
                  descripcion="Documentos del registro calificado: maestro de programa (Guía 1) y, en renovación, respaldo de mejoramiento (Guía 2)."
                  icono={<GraduationCap className="size-5" aria-hidden />}
                  onClick={() => onAlcanceChange('Programa')}
                />
                {permitirAlcanceInstitucion ? (
                  <OpcionTarjeta
                    seleccionado={alcance === 'Institucion'}
                    titulo="Institución (IES)"
                    descripcion="Condiciones institucionales: documento maestro (G3) y, en renovación, respaldo de mejoramiento institucional (G4)."
                    icono={<Building2 className="size-5" aria-hidden />}
                    onClick={() => onAlcanceChange('Institucion')}
                  />
                ) : null}
              </div>
            </section>
          )}
        </>
      )}

      {tramite && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Paso 3</Badge>
            <h3 className="text-sm font-semibold text-primary">
              {documentosDisponibles.length > 1
                ? '¿Qué documento va a cargar en esta evidencia?'
                : 'Documento exigido para este trámite'}
            </h3>
          </div>

          <p className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <strong className="text-foreground">{tramite.nombre}</strong>
            {' · '}
            {etiquetaModalidad(modalidad!)} · {etiquetaAlcance(alcance!)}
            {documentosDisponibles.length > 1 && (
              <>
                {' '}
                · Documentos del trámite: {documentosDisponibles.join(' + ')}
              </>
            )}
          </p>

          <div className="grid gap-3">
            {documentosDisponibles.map((guia) => (
              <OpcionTarjeta
                key={guia}
                seleccionado={codigoGuia === guia}
                titulo={`${guia} — ${ETIQUETAS_GUIA[guia]}`}
                descripcion={DESCRIPCIONES_GUIA[guia]}
                icono={<FileCheck className="size-5" aria-hidden />}
                onClick={() => onCodigoGuiaChange(guia)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
