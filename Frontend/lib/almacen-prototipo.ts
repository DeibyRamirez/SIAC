import {
  carpetasNormativasSemilla,
  condicionesDecretoSemilla,
  documentosRequeridosSemilla,
  etapasAcreditacionSemilla,
} from '@/lib/datos-semilla'
import type {
  AlertaInApp,
  AnexoVigencia,
  CarpetaNormativa,
  CondicionDecreto,
  DocumentoRequerido,
  EtapaAcreditacion,
  Evidencia,
  Plantilla,
  Programa,
} from '@/lib/tipos'

export const CLAVE_ALMACEN = 'siac-almacen-prototipo'

export interface DatosPrototipo {
  programas: Programa[]
  evidencias: Evidencia[]
  plantillas: Plantilla[]
  anexosVigencia: AnexoVigencia[]
  alertas: AlertaInApp[]
  etapas: EtapaAcreditacion[]
  carpetas: CarpetaNormativa[]
  documentosRequeridos: DocumentoRequerido[]
  condiciones: CondicionDecreto[]
}

/**
 * Programas, evidencias, plantillas, vigencias y alertas llegan solo desde la API.
 * Etapas, carpetas, documentos requeridos y condiciones son el catálogo normativo
 * del Decreto 1330 (no datos demo) y no tienen todavía endpoint propio en el almacén.
 */
export function crearDatosIniciales(): DatosPrototipo {
  return {
    programas: [],
    evidencias: [],
    plantillas: [],
    anexosVigencia: [],
    alertas: [],
    etapas: structuredClone(etapasAcreditacionSemilla),
    carpetas: structuredClone(carpetasNormativasSemilla),
    documentosRequeridos: structuredClone(documentosRequeridosSemilla),
    condiciones: structuredClone(condicionesDecretoSemilla),
  }
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
    const datos = JSON.parse(crudo) as Partial<DatosPrototipo>
    const iniciales = crearDatosIniciales()
    return {
      ...iniciales,
      ...datos,
      etapas: fusionarItemsConSemilla(datos.etapas ?? iniciales.etapas, iniciales.etapas),
      carpetas: fusionarItemsConSemilla(datos.carpetas ?? iniciales.carpetas, iniciales.carpetas),
      documentosRequeridos: fusionarItemsConSemilla(
        datos.documentosRequeridos ?? iniciales.documentosRequeridos,
        iniciales.documentosRequeridos,
      ),
      // Nunca rehidratar datos de negocio desde sessionStorage: solo la API es fuente.
      programas: [],
      evidencias: [],
      plantillas: [],
      anexosVigencia: [],
      alertas: [],
      condiciones: datos.condiciones ?? iniciales.condiciones,
    }
  } catch {
    return null
  }
}

export function guardarAlmacenLocal(datos: DatosPrototipo): void {
  sessionStorage.setItem(CLAVE_ALMACEN, JSON.stringify(datos))
}

function fusionarItemsConSemilla<T extends { id: string }>(guardados: T[], semilla: T[]): T[] {
  const mapaSemilla = new Map(semilla.map((item) => [item.id, item]))
  const fusionados = guardados.map((item) => mapaSemilla.get(item.id) ?? item)

  for (const item of semilla) {
    if (!fusionados.some((existente) => existente.id === item.id)) {
      fusionados.push(item)
    }
  }

  return fusionados
}

export function reiniciarAlmacenLocal(): DatosPrototipo {
  const datos = crearDatosIniciales()
  guardarAlmacenLocal(datos)
  return datos
}
