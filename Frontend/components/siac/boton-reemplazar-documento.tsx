'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { reemplazarDocumentoGestionApi } from '@/lib/servicios/evidencias.servicio'
import type { Evidencia, EstadoEvidencia, RolUsuario } from '@/lib/tipos'

const ROLES_QUE_REEMPLAZAN: RolUsuario[] = ['Revisor', 'Administrador', 'SuperAdmin']

/** ¿Puede este rol reemplazar el documento en este estado? (el Borrador lo gestiona su autor). */
export function puedeReemplazarDocumento(rol: RolUsuario | undefined, estado: EstadoEvidencia): boolean {
  return Boolean(rol && ROLES_QUE_REEMPLAZAN.includes(rol) && estado !== 'Borrador')
}

interface PropsBotonReemplazarDocumento {
  evidenciaId: string
  estado: EstadoEvidencia
  rol: RolUsuario | undefined
  onReemplazado?: (evidencia: Evidencia) => void
}

/**
 * Revisor y Administrador suben o reemplazan el documento aunque ya esté validado.
 * El backend conserva la versión anterior y registra quién y cuándo en el historial.
 */
export function BotonReemplazarDocumento({ evidenciaId, estado, rol, onReemplazado }: PropsBotonReemplazarDocumento) {
  const entrada = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  if (!puedeReemplazarDocumento(rol, estado)) return null

  async function alElegir(archivo: File | undefined) {
    if (!archivo) return
    const validado = estado === 'Validado' || estado === 'Cumple'
    if (
      validado &&
      !window.confirm(
        'El documento ya está validado. Se guardará como una versión nueva y la anterior quedará en el historial. ¿Continuar?',
      )
    ) {
      return
    }
    setSubiendo(true)
    try {
      const actualizada = await reemplazarDocumentoGestionApi(evidenciaId, archivo)
      toast.success('Documento reemplazado. La versión anterior quedó en el historial.')
      onReemplazado?.(actualizada)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo reemplazar el documento.')
    } finally {
      setSubiendo(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={entrada}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        aria-label="Archivo de reemplazo"
        data-testid="entrada-reemplazo-documento"
        onChange={(e) => void alElegir(e.target.files?.[0])}
      />
      <Button type="button" variant="outline" disabled={subiendo} onClick={() => entrada.current?.click()}>
        {subiendo ? 'Subiendo archivo…' : 'Reemplazar documento'}
      </Button>
    </>
  )
}
