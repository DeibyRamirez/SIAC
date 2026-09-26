'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { CargadorGlobal } from '@/components/siac/cargador-global'
import {
  registrarControlCargaGlobal,
  type EstadoCargaGlobal,
} from '@/lib/servicios/control-carga-global'

interface ContextoCargaGlobal {
  iniciarCarga: (mensaje?: string) => void
  finalizarCarga: () => void
  conCarga: <T>(mensaje: string, operacion: () => Promise<T>) => Promise<T>
}

const ContextoCarga = createContext<ContextoCargaGlobal | null>(null)

export function ProveedorCargaGlobal({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoCargaGlobal>({
    visible: false,
    mensaje: 'Procesando…',
    progreso: 0,
  })
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const detenerAnimacion = useCallback(() => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current)
      intervaloRef.current = null
    }
  }, [])

  const iniciarCarga = useCallback(
    (mensaje = 'Procesando…') => {
      detenerAnimacion()
      setEstado({ visible: true, mensaje, progreso: 12 })
      intervaloRef.current = setInterval(() => {
        setEstado((prev) => {
          if (!prev.visible) return prev
          const siguiente = Math.min(prev.progreso + 8, 92)
          return { ...prev, progreso: siguiente }
        })
      }, 280)
    },
    [detenerAnimacion],
  )

  const finalizarCarga = useCallback(() => {
    detenerAnimacion()
    setEstado((prev) => ({ ...prev, progreso: 100 }))
    window.setTimeout(() => {
      setEstado({ visible: false, mensaje: 'Procesando…', progreso: 0 })
    }, 220)
  }, [detenerAnimacion])

  const conCarga = useCallback(
    async <T,>(mensaje: string, operacion: () => Promise<T>): Promise<T> => {
      iniciarCarga(mensaje)
      try {
        return await operacion()
      } finally {
        finalizarCarga()
      }
    },
    [iniciarCarga, finalizarCarga],
  )

  useEffect(() => {
    registrarControlCargaGlobal({ iniciarCarga, finalizarCarga })
    return () => registrarControlCargaGlobal(null)
  }, [iniciarCarga, finalizarCarga])

  useEffect(() => () => detenerAnimacion(), [detenerAnimacion])

  const valor = useMemo(
    () => ({ iniciarCarga, finalizarCarga, conCarga }),
    [iniciarCarga, finalizarCarga, conCarga],
  )

  return (
    <ContextoCarga.Provider value={valor}>
      {children}
      <CargadorGlobal
        visible={estado.visible}
        mensaje={estado.mensaje}
        progreso={estado.progreso}
      />
    </ContextoCarga.Provider>
  )
}

export function usarCargaGlobal(): ContextoCargaGlobal {
  const ctx = useContext(ContextoCarga)
  if (!ctx) {
    throw new Error('usarCargaGlobal debe usarse dentro de ProveedorCargaGlobal')
  }
  return ctx
}
