import {
  alertasSemilla,
  anexosVigenciaSemilla,
  carpetasNormativasSemilla,
  condicionesDecretoSemilla,
  documentosRequeridosSemilla,
  etapasAcreditacionSemilla,
  evidenciasSemilla,
  plantillasSemilla,
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
} from '@/lib/tipos'

export const CLAVE_ALMACEN = 'siac-almacen-prototipo'

export interface DatosPrototipo {
  evidencias: Evidencia[]
  plantillas: Plantilla[]
  anexosVigencia: AnexoVigencia[]
  alertas: AlertaInApp[]
  etapas: EtapaAcreditacion[]
  carpetas: CarpetaNormativa[]
  documentosRequeridos: DocumentoRequerido[]
  condiciones: CondicionDecreto[]
}

export function crearDatosIniciales(): DatosPrototipo {
  return {
    evidencias: structuredClone(evidenciasSemilla),
    plantillas: structuredClone(plantillasSemilla),
    anexosVigencia: structuredClone(anexosVigenciaSemilla),
    alertas: structuredClone(alertasSemilla),
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
      plantillas: fusionarPlantillasConSemilla(
        datos.plantillas ?? iniciales.plantillas,
        iniciales.plantillas,
      ),
      evidencias: fusionarEvidenciasConSemilla(
        datos.evidencias ?? iniciales.evidencias,
        iniciales.evidencias,
      ),
      etapas: fusionarItemsConSemilla(datos.etapas ?? iniciales.etapas, iniciales.etapas),
      carpetas: fusionarItemsConSemilla(datos.carpetas ?? iniciales.carpetas, iniciales.carpetas),
      documentosRequeridos: fusionarItemsConSemilla(
        datos.documentosRequeridos ?? iniciales.documentosRequeridos,
        iniciales.documentosRequeridos,
      ),
      anexosVigencia: datos.anexosVigencia ?? iniciales.anexosVigencia,
      alertas: datos.alertas ?? iniciales.alertas,
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

export function fusionarEvidenciasConSemilla(
  guardadas: DatosPrototipo['evidencias'],
  semilla: DatosPrototipo['evidencias'],
): DatosPrototipo['evidencias'] {
  const mapaSemilla = new Map(semilla.map((evidencia) => [evidencia.id, evidencia]))
  const fusionadas = guardadas.map((evidencia) => {
    const base = mapaSemilla.get(evidencia.id)
    if (!base) return evidencia
    return {
      ...evidencia,
      documentoRequeridoId: evidencia.documentoRequeridoId ?? base.documentoRequeridoId,
    }
  })

  for (const evidencia of semilla) {
    if (!fusionadas.some((item) => item.id === evidencia.id)) {
      fusionadas.push(evidencia)
    }
  }

  return fusionadas
}

export function fusionarPlantillasConSemilla(
  guardadas: Plantilla[],
  semilla: Plantilla[],
): Plantilla[] {
  const mapaSemilla = new Map(semilla.map((plantilla) => [plantilla.id, plantilla]))
  const fusionadas = guardadas.map((plantilla) => {
    const base = mapaSemilla.get(plantilla.id)
    if (!base) return plantilla
    return {
      ...plantilla,
      urlDocumento: plantilla.urlDocumento ?? base.urlDocumento,
    }
  })

  for (const plantilla of semilla) {
    if (!fusionadas.some((item) => item.id === plantilla.id)) {
      fusionadas.push(plantilla)
    }
  }

  return fusionadas
}

export function reiniciarAlmacenLocal(): DatosPrototipo {
  const datos = crearDatosIniciales()
  guardarAlmacenLocal(datos)
  return datos
}
