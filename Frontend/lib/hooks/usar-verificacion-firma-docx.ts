'use client'

import { useCallback, useState } from 'react'

import { ErrorApi } from '@/lib/servicios/cliente-api'
import { verificarFirmaEvidenciaApi } from '@/lib/servicios/evidencias.servicio'
import { inspeccionarFirmaDocx } from '@/lib/utilidades/leer-firma-docx'

export type EstadoVerificacionFirma =
  | 'inactivo'
  | 'verificando'
  | 'valido'
  | 'invalido'

const MENSAJE_NO_CORRESPONDE =
  'Este archivo no corresponde a la última descarga de la evidencia. Descarga de nuevo el documento y edita esa copia.'

const MENSAJE_ERROR_VERIFICACION =
  'No se pudo verificar la firma. Intenta de nuevo o recarga la página.'

interface ResultadoVerificacion {
  valida: boolean
  mensaje: string
}

function mensajeDeError(err: unknown): string {
  if (err instanceof ErrorApi) {
    if (
      err.codigoEstado === 401 ||
      err.codigoEstado === 403 ||
      err.codigoEstado >= 500
    ) {
      return MENSAJE_ERROR_VERIFICACION
    }
    return err.message || MENSAJE_ERROR_VERIFICACION
  }
  return MENSAJE_ERROR_VERIFICACION
}

/**
 * Lee la firma embebida del .docx y la compara con la versión vigente en el backend.
 * No crea versiones ni rota la firma: es la misma comprobación para cargador y revisor.
 */
export function usarVerificacionFirmaDocx(
  mensajeExito = 'Documento válido: corresponde a la última descarga',
  mensajeNoCorresponde = MENSAJE_NO_CORRESPONDE,
) {
  const [estado, setEstado] = useState<EstadoVerificacionFirma>('inactivo')
  const [mensaje, setMensaje] = useState<string | null>(null)

  const limpiar = useCallback(() => {
    setEstado('inactivo')
    setMensaje(null)
  }, [])

  const verificar = useCallback(
    async (archivo: File, evidenciaId: string): Promise<ResultadoVerificacion> => {
      setEstado('verificando')
      setMensaje(null)

      const { esDocxValido, firma } = await inspeccionarFirmaDocx(archivo)
      if (!esDocxValido) {
        const texto = 'El archivo no es un .docx válido.'
        setEstado('invalido')
        setMensaje(texto)
        return { valida: false, mensaje: texto }
      }

      if (!firma) {
        setEstado('invalido')
        setMensaje(mensajeNoCorresponde)
        return { valida: false, mensaje: mensajeNoCorresponde }
      }

      try {
        const resultado = await verificarFirmaEvidenciaApi(evidenciaId, firma)
        if (!resultado.valida) {
          setEstado('invalido')
          setMensaje(mensajeNoCorresponde)
          return { valida: false, mensaje: mensajeNoCorresponde }
        }
        const texto = mensajeExito
        setEstado('valido')
        setMensaje(texto)
        return { valida: true, mensaje: texto }
      } catch (err) {
        const texto = mensajeDeError(err)
        setEstado('invalido')
        setMensaje(texto)
        return { valida: false, mensaje: texto }
      }
    },
    [mensajeExito, mensajeNoCorresponde],
  )

  return { estado, mensaje, verificar, limpiar }
}
