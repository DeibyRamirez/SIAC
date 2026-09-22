import {
  alertasSemilla,
  anexosVigenciaSemilla,
  evidenciasSemilla,
  plantillasSemilla,
} from '@/lib/datos-semilla'
import type { AlertaInApp, AnexoVigencia, Evidencia, Plantilla } from '@/lib/tipos'

export const CLAVE_ALMACEN = 'siac-almacen-prototipo'

export interface DatosPrototipo {
  evidencias: Evidencia[]
  plantillas: Plantilla[]
  anexosVigencia: AnexoVigencia[]
  alertas: AlertaInApp[]
}

export function crearDatosIniciales(): DatosPrototipo {
  return {
    evidencias: structuredClone(evidenciasSemilla),
    plantillas: structuredClone(plantillasSemilla),
    anexosVigencia: structuredClone(anexosVigenciaSemilla),
    alertas: structuredClone(alertasSemilla),
  }
}

export function fusionarEvidenciasConSemilla(
  guardadas: Evidencia[],
  semilla: Evidencia[],
): Evidencia[] {
  const mapa = new Map(semilla.map((item) => [item.id, item]))
  const fusionadas = guardadas.map((item) => mapa.get(item.id) ?? item)
  for (const item of semilla) {
    if (!fusionadas.some((existente) => existente.id === item.id)) {
      fusionadas.push(item)
    }
  }
  return fusionadas
}

export function fusionarPlantillasConSemilla(
  guardadas: Plantilla[],
  semilla: Plantilla[],
): Plantilla[] {
  const mapa = new Map(semilla.map((item) => [item.id, item]))
  const fusionadas = guardadas.map((item) => mapa.get(item.id) ?? item)
  for (const item of semilla) {
    if (!fusionadas.some((existente) => existente.id === item.id)) {
      fusionadas.push(item)
    }
  }
  return fusionadas
}

export function leerAlmacenLocal(): DatosPrototipo | null {
  if (typeof window === 'undefined') {
    return null
  }

  const crudo = sessionStorage.getItem(CLAVE_ALMACEN)
  if (!crudo) {
    return null
  }

  try {
    return JSON.parse(crudo) as DatosPrototipo
  } catch {
    return null
  }
}

export function guardarAlmacenLocal(datos: DatosPrototipo): void {
  sessionStorage.setItem(CLAVE_ALMACEN, JSON.stringify(datos))
}

export function reiniciarAlmacenLocal(): DatosPrototipo {
  const datos = crearDatosIniciales()
  guardarAlmacenLocal(datos)
  return datos
}
