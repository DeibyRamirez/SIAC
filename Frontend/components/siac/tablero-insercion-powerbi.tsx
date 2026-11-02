'use client'

import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  incrustarInformePowerBi,
  type InformeIncrustado,
} from '@/lib/powerbi/cliente-insercion'
import {
  ESPERAS_REINTENTO_MS,
  MARGEN_RENOVACION_MS,
  REINTENTOS_RENOVACION,
  ejecutarConReintentos,
  milisegundosHastaRenovacion,
  tokenSigueVigente,
} from '@/lib/powerbi/renovacion-token'
import {
  obtenerConfiguracionInsercionPowerBiApi,
  obtenerTokenInsercionPowerBiApi,
  type ConfiguracionInsercionPowerBi,
} from '@/lib/servicios/powerbi.servicio'

interface TableroInsercionPowerBiProps {
  /** Cambia cuando el panel guarda la configuración, para volver a leer el interruptor. */
  version?: number
}

/**
 * Informe embebido con token. Si el interruptor está apagado no renderiza nada:
 * el dashboard público sigue igual. El token no se escribe en localStorage.
 */
export function TableroInsercionPowerBi({ version = 0 }: TableroInsercionPowerBiProps) {
  const [config, setConfig] = useState<ConfiguracionInsercionPowerBi | null>(null)
  const [fase, setFase] = useState<'lista' | 'error'>('lista')
  const [avisoRenovacion, setAvisoRenovacion] = useState(false)
  const [intento, setIntento] = useState(0)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const renovarRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    let vigente = true
    obtenerConfiguracionInsercionPowerBiApi()
      .then((datos) => {
        if (vigente) setConfig(datos)
      })
      .catch(() => {
        if (vigente) setConfig(null)
      })
    return () => {
      vigente = false
    }
  }, [version, intento])

  useEffect(() => {
    if (!config?.activo || fase !== 'lista') return
    const contenedor = contenedorRef.current
    if (!contenedor) return

    let cancelado = false
    let informe: InformeIncrustado | null = null
    let expiraEn: string | null = null
    let temporizador = 0

    const limpiarTemporizador = () => window.clearTimeout(temporizador)

    const programar = (iso: string) => {
      limpiarTemporizador()
      temporizador = window.setTimeout(() => {
        void renovar()
      }, milisegundosHastaRenovacion(iso, Date.now()))
    }

    const renovar = async () => {
      try {
        const nuevo = await ejecutarConReintentos(() => obtenerTokenInsercionPowerBiApi(), {
          reintentos: REINTENTOS_RENOVACION,
          esperasMs: ESPERAS_REINTENTO_MS,
          esperar: (ms) =>
            new Promise((resolver) => {
              window.setTimeout(resolver, ms)
            }),
        })
        if (cancelado || !informe) return
        expiraEn = nuevo.expiraEn
        await informe.fijarToken(nuevo.token)
        if (cancelado) return
        setAvisoRenovacion(false)
        programar(nuevo.expiraEn)
      } catch {
        if (cancelado) return
        if (expiraEn && tokenSigueVigente(expiraEn, Date.now())) {
          setAvisoRenovacion(true)
          limpiarTemporizador()
          const restante = Date.parse(expiraEn) - Date.now()
          temporizador = window.setTimeout(() => {
            if (!tokenSigueVigente(expiraEn ?? '', Date.now())) setFase('error')
          }, Math.max(0, restante))
          return
        }
        setFase('error')
      }
    }

    renovarRef.current = () => {
      void renovar()
    }

    const alCambiarVisibilidad = () => {
      if (document.visibilityState !== 'visible' || !expiraEn) return
      if (!tokenSigueVigente(expiraEn, Date.now())) {
        setFase('error')
        return
      }
      if (Date.parse(expiraEn) - Date.now() <= MARGEN_RENOVACION_MS) void renovar()
    }

    const cargar = async () => {
      try {
        const token = await obtenerTokenInsercionPowerBiApi()
        if (cancelado) return
        informe = await incrustarInformePowerBi(contenedor, token)
        expiraEn = token.expiraEn
        programar(token.expiraEn)
      } catch {
        if (!cancelado) setFase('error')
      }
    }

    void cargar()
    document.addEventListener('visibilitychange', alCambiarVisibilidad)

    return () => {
      cancelado = true
      limpiarTemporizador()
      document.removeEventListener('visibilitychange', alCambiarVisibilidad)
      informe?.destruir()
      renovarRef.current = () => undefined
    }
  }, [config?.activo, fase, intento])

  if (!config?.activo) return null

  if (fase === 'error') {
    return (
      <Card className="tarjeta-institucional">
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-destructive" role="alert">
            No se pudo cargar el tablero
          </p>
          <Button
            type="button"
            onClick={() => {
              setAvisoRenovacion(false)
              setFase('lista')
              setIntento((valor) => valor + 1)
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {avisoRenovacion ? (
        <Card className="tarjeta-institucional">
          <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground" role="status">
              No se pudo renovar el acceso. El tablero sigue visible mientras el token anterior
              siga vigente.
            </p>
            <Button type="button" variant="outline" onClick={() => renovarRef.current()}>
              <RefreshCw className="size-4" aria-hidden />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <div className="tarjeta-visual overflow-hidden bg-white">
        <div className="border-b px-4 py-3 text-sm text-muted-foreground">
          Tablero Power BI
        </div>
        <div
          ref={contenedorRef}
          className="min-h-[520px] w-full"
          aria-label="Tablero de Power BI"
        />
      </div>
    </div>
  )
}
