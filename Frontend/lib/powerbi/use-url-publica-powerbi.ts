'use client'

import { useEffect, useState } from 'react'

import type { CategoriaIdPowerBi } from '@/lib/informes-powerbi'
import {
  estadoDesdeUrlPublica,
  type EstadoUrlPowerBi,
} from '@/lib/powerbi/configuracion-powerbi'
import { obtenerUrlInformePowerBiApi } from '@/lib/servicios/powerbi.servicio'

export function useUrlPublicaPowerBi(categoriaId: CategoriaIdPowerBi): EstadoUrlPowerBi {
  const [estado, setEstado] = useState<EstadoUrlPowerBi>({ estado: 'no-publicada' })

  useEffect(() => {
    let vigente = true

    obtenerUrlInformePowerBiApi(categoriaId)
      .then((respuesta) => {
        if (!vigente) return
        setEstado(estadoDesdeUrlPublica(respuesta.url))
      })
      .catch(() => {
        if (!vigente) return
        setEstado({ estado: 'no-publicada' })
      })

    return () => {
      vigente = false
    }
  }, [categoriaId])

  return estado
}
