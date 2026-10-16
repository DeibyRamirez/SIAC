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
  deshabilitado?: boolean
}

function OpcionTarjeta({
  seleccionado,
  titulo,
  descripcion,
  icono,
  onClick,
  deshabilitado = false,
}: OpcionTarjetaProps) {
  return (
    <button
      type="button"
      disabled={deshabilitado}
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors',
        deshabilitado && 'cursor-not-allowed opacity-60',
        seleccionado
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40',
        deshabilitado && !seleccionado && 'hover:border-border hover:bg-card',
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
  /** Trámite sugerido según programa o institución (informativo; no oculta los pasos). */
  tramiteSugerido?: {
    nombre: string
    modalidad: ModalidadTramiteUI
    alcance: AlcanceTramiteUI
    contexto?: string
  } | null
  /** Si el usuario puede cargar el proceso institucional (G3/G4) asignado por el administrador. */
  permitirAlcanceInstitucion?: boolean
  /** Guías habilitadas para nueva carga (API progreso). */
  guiasDisponibles?: CodigoDocumentoGuia[]
  bloqueosCarga?: { codigoGuia: CodigoDocumentoGuia; motivo: string }[]
  /** Trámite fijado por programa/IES: no editar modalidad ni alcance. */
  bloquearPasosTramite?: boolean
  inicioNumeracion?: number
}

export function SelectorTramiteCargaEvidencia({
  modalidad,
  alcance,
  codigoGuia,
  onModalidadChange,
  onAlcanceChange,
  onCodigoGuiaChange,
  tramiteSugerido = null,
  permitirAlcanceInstitucion = false,
  guiasDisponibles,
  bloqueosCarga = [],
  bloquearPasosTramite = false,
  inicioNumeracion = 1,
}: SelectorTramiteCargaEvidenciaProps) {
  const tramite =
    modalidad && alcance ? tramiteDesdeSeleccion(alcance, modalidad) : null
  const documentosTramite = tramite?.documentosGuia ?? []
  const pasoModalidad = inicioNumeracion
  const pasoAlcance = inicioNumeracion + 1
  const pasoGuia = bloquearPasosTramite ? inicioNumeracion + 1 : inicioNumeracion + 2

  function guiaHabilitada(guia: CodigoDocumentoGuia): boolean {
    if (!guiasDisponibles) return true
    return guiasDisponibles.includes(guia)
  }

  function motivoBloqueo(guia: CodigoDocumentoGuia): string | undefined {
    return bloqueosCarga.find((b) => b.codigoGuia === guia)?.motivo
  }

  return (
    <div className="space-y-6">
      {tramiteSugerido && !bloquearPasosTramite ? (
        <p className="rounded-lg border border-cyan-tecnico/30 bg-cyan-tecnico/5 px-3 py-2 text-sm text-muted-foreground">
          <strong className="text-foreground">Sugerencia del sistema:</strong>{' '}
          {tramiteSugerido.contexto ? `${tramiteSugerido.contexto} — ` : ''}
          <strong className="text-foreground">{tramiteSugerido.nombre}</strong>
          {' · '}
          {etiquetaModalidad(tramiteSugerido.modalidad)} ·{' '}
          {etiquetaAlcance(tramiteSugerido.alcance)}. Confirme los pasos 1 y 2 o ajústelos si
          corresponde a otro documento.
        </p>
      ) : null}

      {bloquearPasosTramite && tramite ? (
        <section className="space-y-2 rounded-lg border border-primary/20 bg-muted/30 px-3 py-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Paso {pasoModalidad}</Badge>
            <h3 className="text-sm font-semibold text-primary">Trámite activo</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{tramite.nombre}</strong>
            {' · '}
            {etiquetaModalidad(modalidad!)} · {etiquetaAlcance(alcance!)}
          </p>
        </section>
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Paso {pasoModalidad}</Badge>
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
                <Badge variant="secondary">Paso {pasoAlcance}</Badge>
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
            <Badge variant="secondary">Paso {pasoGuia}</Badge>
            <h3 className="text-sm font-semibold text-primary">
              ¿Qué documento guía va a cargar en esta evidencia?
            </h3>
          </div>

          {!bloquearPasosTramite ? (
            <p className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <strong className="text-foreground">{tramite.nombre}</strong>
              {' · '}
              {etiquetaModalidad(modalidad!)} · {etiquetaAlcance(alcance!)}
              {documentosTramite.length > 1 && (
                <>
                  {' '}
                  · Documentos del trámite: {documentosTramite.join(' + ')}
                </>
              )}
            </p>
          ) : null}

          {guiasDisponibles && guiasDisponibles.length === 0 ? (
            <p className="rounded-lg border border-ocre/40 bg-ocre/10 px-3 py-2 text-sm text-ocre">
              No hay documentos disponibles para cargar en este momento. Espere la validación del
              revisor o complete el documento anterior del trámite.
            </p>
          ) : null}

          <div className="grid gap-3">
            {documentosTramite.map((guia) => {
              const habilitada = guiaHabilitada(guia)
              const motivo = motivoBloqueo(guia)
              return (
                <div key={guia} className="space-y-1">
                  <OpcionTarjeta
                    seleccionado={codigoGuia === guia}
                    deshabilitado={!habilitada}
                    titulo={`${guia} — ${ETIQUETAS_GUIA[guia]}`}
                    descripcion={
                      habilitada
                        ? DESCRIPCIONES_GUIA[guia]
                        : (motivo ?? 'No disponible en el trámite actual.')
                    }
                    icono={<FileCheck className="size-5" aria-hidden />}
                    onClick={() => {
                      if (habilitada) onCodigoGuiaChange(guia)
                    }}
                  />
                  {!habilitada && motivo ? (
                    <p className="px-1 text-xs text-muted-foreground">{motivo}</p>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
