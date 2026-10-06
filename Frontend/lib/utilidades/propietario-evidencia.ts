import type { CodigoDocumentoGuia } from '@/lib/tipos'

/** HU-010: G3 y G4 pertenecen a la institución; G1, G2 y los documentos sin guía, a un programa. */
export function esGuiaInstitucional(codigoGuia: CodigoDocumentoGuia | string | null | undefined): boolean {
  return codigoGuia === 'G3' || codigoGuia === 'G4'
}

/**
 * Campos de propietario que se envían al crear la evidencia (POST /evidencias).
 * G3/G4: nunca `programaId`; `institucionId` solo si se conoce (si no, el backend usa la CUAC).
 * G1/G2: solo `programaId`.
 */
export function camposPropietarioEvidencia(datos: {
  codigoGuia?: CodigoDocumentoGuia | string | null
  programaId?: string | null
  institucionId?: string | null
}): Array<[campo: 'programaId' | 'institucionId', valor: string]> {
  if (esGuiaInstitucional(datos.codigoGuia)) {
    return datos.institucionId ? [['institucionId', datos.institucionId]] : []
  }
  return datos.programaId ? [['programaId', datos.programaId]] : []
}

/** Institución única de SIAC (registro `inst-cuac`); propietaria por defecto de G3/G4. */
export const INSTITUCION_POR_DEFECTO = 'Corporación Universitaria Autónoma del Cauca (CUAC)'
