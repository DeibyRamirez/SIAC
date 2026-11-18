'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { DialogoConfirmacion } from '@/components/siac/dialogo-confirmacion'
import { Button } from '@/components/ui/button'
import { validarTamanoEvidencia } from '@/lib/constantes/documentos'
import { reemplazarDocumentoGestionApi } from '@/lib/servicios/evidencias.servicio'
import type { Evidencia, EstadoEvidencia, RolUsuario } from '@/lib/tipos'
import { esDocumentoAprobado } from '@/lib/utilidades-siac'

const ROLES_QUE_REEMPLAZAN: RolUsuario[] = ['Revisor', 'Administrador', 'SuperAdmin']

/**
 * ¿Puede este rol reemplazar el documento en este estado?
 * El Revisor solo puede hacerlo con el documento aprobado (Cumple o Validado); el flujo nuevo vive en Historial.
 */
export function puedeReemplazarDocumento(
  rol: RolUsuario | undefined,
  estado: EstadoEvidencia,
): boolean {
  if (!rol || !ROLES_QUE_REEMPLAZAN.includes(rol) || estado === 'Borrador') {
    return false
  }
  return rol !== 'Revisor' || esDocumentoAprobado(estado)
}

interface PropsBotonReemplazarDocumento {
  evidenciaId: string
  estado: EstadoEvidencia
  rol: RolUsuario | undefined
  onReemplazado?: (evidencia: Evidencia) => void
}

/**
 * Flujo heredado de Administrador/SuperAdmin (el del Revisor se retiró de la bandeja).
 * Confirma antes de subir y conserva la validación de firma del backend.
 */
export function BotonReemplazarDocumento({
  evidenciaId,
  estado,
  rol,
  onReemplazado,
}: PropsBotonReemplazarDocumento) {
  const entrada = useRef<HTMLInputElement>(null)
  const [archivoPendiente, setArchivoPendiente] = useState<File | null>(null)
  const [confirmar, setConfirmar] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  if (!puedeReemplazarDocumento(rol, estado)) return null

  function alElegir(archivo: File | undefined) {
    if (!archivo) return
    if (!archivo.name.toLowerCase().endsWith('.docx')) {
      toast.error('Solo se permiten documentos Word (.docx).')
      if (entrada.current) entrada.current.value = ''
      return
    }
    const errorTamano = validarTamanoEvidencia(archivo.size)
    if (errorTamano) {
      toast.error(errorTamano)
      if (entrada.current) entrada.current.value = ''
      return
    }
    setArchivoPendiente(archivo)
    setConfirmar(true)
  }

  async function subir() {
    if (!archivoPendiente) return
    setSubiendo(true)
    try {
      const actualizada = await reemplazarDocumentoGestionApi(
        evidenciaId,
        archivoPendiente,
      )
      toast.success('Nueva versión cargada. El estado de la evidencia no cambió.')
      onReemplazado?.(actualizada)
      setConfirmar(false)
      setArchivoPendiente(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo subir la nueva versión.',
      )
    } finally {
      setSubiendo(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  function cancelar() {
    setConfirmar(false)
    setArchivoPendiente(null)
    if (entrada.current) entrada.current.value = ''
  }

  return (
    <div className="space-y-2">
      <input
        ref={entrada}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        aria-label="Archivo de nueva versión"
        data-testid="entrada-reemplazo-documento"
        onChange={(e) => alElegir(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        disabled={subiendo}
        onClick={() => entrada.current?.click()}
      >
        {subiendo ? 'Subiendo archivo…' : 'Subir nueva versión'}
      </Button>
      <p className="max-w-md text-xs text-muted-foreground">
        Descarga el documento firmado, edítalo y súbelo; los archivos sin firma válida se
        rechazan.
      </p>

      <DialogoConfirmacion
        abierto={confirmar}
        titulo="¿Publicar la nueva versión?"
        descripcion={`Se subirá «${archivoPendiente?.name ?? 'el documento'}» como una versión nueva de la evidencia. La versión anterior quedará en el historial y el estado actual (${estado}) se conservará.`}
        etiquetaConfirmar="Sí, publicar"
        cargando={subiendo}
        onConfirmar={() => void subir()}
        onCancelar={cancelar}
      />
    </div>
  )
}
