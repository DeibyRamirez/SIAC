'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'

import { DialogoConfirmacion } from '@/components/siac/dialogo-confirmacion'
import { ZonaCargaDocx } from '@/components/siac/zona-carga-docx'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { validarTamanoEvidencia } from '@/lib/constantes/documentos'
import { usarVerificacionFirmaDocx } from '@/lib/hooks/usar-verificacion-firma-docx'
import { publicarVersionRevisorApi } from '@/lib/servicios/evidencias.servicio'
import type { Evidencia } from '@/lib/tipos'

interface PropsDialogoSubirVersionRevisor {
  abierto: boolean
  onCerrar: () => void
  evidenciaId: string
  versionOrigen: number
  nombreDocumento: string
  onPublicada: (evidencia: Evidencia) => void
}

/**
 * Diálogo de nueva versión del revisor. La firma se verifica al seleccionar el archivo
 * con el mismo hook que usa el cargador; el backend revalida y aplica CAS al publicar.
 */
export function DialogoSubirVersionRevisor({
  abierto,
  onCerrar,
  evidenciaId,
  versionOrigen,
  nombreDocumento,
  onPublicada,
}: PropsDialogoSubirVersionRevisor) {
  const verificacion = usarVerificacionFirmaDocx(
    'Documento válido: corresponde a la última versión',
  )
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const [confirmarEnviar, setConfirmarEnviar] = useState(false)
  const [publicando, setPublicando] = useState(false)

  function limpiar() {
    setArchivo(null)
    setError(null)
    setConfirmarCancelar(false)
    setConfirmarEnviar(false)
    verificacion.limpiar()
  }

  function cerrarYLimpiar() {
    limpiar()
    onCerrar()
  }

  function solicitarCierre() {
    if (publicando) return
    setConfirmarCancelar(true)
  }

  async function elegirArchivo(file: File | null) {
    setError(null)
    verificacion.limpiar()
    setArchivo(file)
    if (!file) return

    const errorTamano = validarTamanoEvidencia(file.size)
    if (errorTamano) {
      setArchivo(null)
      setError(errorTamano)
      return
    }

    const resultado = await verificacion.verificar(file, evidenciaId)
    if (!resultado.valida) {
      setArchivo(null)
    }
  }

  async function publicar() {
    if (!archivo || verificacion.estado !== 'valido') return
    setPublicando(true)
    setError(null)
    try {
      const actualizada = await publicarVersionRevisorApi(
        evidenciaId,
        archivo,
        versionOrigen,
      )
      setConfirmarEnviar(false)
      cerrarYLimpiar()
      onPublicada(actualizada)
    } catch (err) {
      setConfirmarEnviar(false)
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo publicar la nueva versión.',
      )
    } finally {
      setPublicando(false)
    }
  }

  return (
    <>
      <Dialog
        open={abierto}
        onOpenChange={(open) => {
          if (!open) solicitarCierre()
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Subir nueva versión</DialogTitle>
            <DialogDescription>
              Documento: {nombreDocumento}. Versión vigente: v{versionOrigen}. La nueva
              versión quedará activa si la firma corresponde a la última descarga.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <ZonaCargaDocx
              archivo={archivo}
              onArchivoSeleccionado={(file) => void elegirArchivo(file)}
              deshabilitado={publicando || verificacion.estado === 'verificando'}
            />

            {verificacion.estado === 'verificando' ? (
              <p className="text-xs text-muted-foreground" role="status">
                Verificando firma…
              </p>
            ) : null}

            {verificacion.mensaje ? (
              <p
                role={verificacion.estado === 'invalido' ? 'alert' : 'status'}
                className={
                  verificacion.estado === 'valido'
                    ? 'rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700'
                    : 'rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700'
                }
              >
                {verificacion.mensaje}
              </p>
            ) : null}

            {error ? (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            ) : null}

            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Upload className="size-3.5" aria-hidden />
              Solo se aceptan documentos Word (.docx) firmados por SIAC.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={publicando}
              onClick={solicitarCierre}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={
                publicando ||
                !archivo ||
                verificacion.estado !== 'valido'
              }
              onClick={() => setConfirmarEnviar(true)}
            >
              {publicando ? 'Publicando…' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DialogoConfirmacion
        abierto={confirmarCancelar}
        titulo="¿Descartar la nueva versión?"
        descripcion="Se perderá el archivo seleccionado."
        etiquetaConfirmar="Sí, descartar"
        variant="destructive"
        onConfirmar={cerrarYLimpiar}
        onCancelar={() => setConfirmarCancelar(false)}
      />

      <DialogoConfirmacion
        abierto={confirmarEnviar}
        titulo={`¿Publicar la nueva versión v${versionOrigen + 1}?`}
        descripcion="Quedará como versión activa. El backend revalidará la firma y la versión de origen antes de publicar."
        etiquetaConfirmar="Sí, publicar"
        cargando={publicando}
        onConfirmar={() => void publicar()}
        onCancelar={() => setConfirmarEnviar(false)}
      />
    </>
  )
}
