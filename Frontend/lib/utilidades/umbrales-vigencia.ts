/** Límite del backend: 84 meses de vigencia completa (7 años). */
export const MAX_MESES_UMBRAL_VIGENCIA = 84

/**
 * Validación de cliente de los umbrales de vigencia (T-007.3a), espejo del DTO:
 * enteros 1..84 y mesesAvisoVigencia > mesesRojoVigencia ≥ 1 (decisión 16/10/2026: el rojo
 * ocurre siempre antes del fin de vigencia).
 */
export function validarUmbralesVigencia(
  mesesAvisoVigencia: number,
  mesesRojoVigencia: number,
): string | null {
  if (!Number.isInteger(mesesAvisoVigencia) || !Number.isInteger(mesesRojoVigencia)) {
    return 'Los umbrales deben ser meses enteros.'
  }
  if (mesesAvisoVigencia < 1 || mesesAvisoVigencia > MAX_MESES_UMBRAL_VIGENCIA) {
    return `El aviso debe estar entre 1 y ${MAX_MESES_UMBRAL_VIGENCIA} meses.`
  }
  if (mesesRojoVigencia < 1 || mesesRojoVigencia > MAX_MESES_UMBRAL_VIGENCIA) {
    return `El rojo debe estar entre 1 y ${MAX_MESES_UMBRAL_VIGENCIA} meses.`
  }
  if (mesesAvisoVigencia <= mesesRojoVigencia) {
    return 'El aviso (amarillo) debe ser mayor que el rojo.'
  }
  return null
}
