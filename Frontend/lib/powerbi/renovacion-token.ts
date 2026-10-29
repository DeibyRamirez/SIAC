/** Minutos de margen: se renueva cuando al token le queda este tiempo o menos. */
export const MARGEN_RENOVACION_MS = 5 * 60 * 1000

/** Reintentos después del primer fallo de renovación. */
export const REINTENTOS_RENOVACION = 3

/** Espera entre reintentos: 1 s, 2 s y 4 s. */
export const ESPERAS_REINTENTO_MS = [1_000, 2_000, 4_000] as const

export function milisegundosHastaRenovacion(expiraEnIso: string, ahoraMs: number): number {
  const expira = Date.parse(expiraEnIso)
  if (Number.isNaN(expira)) return 0
  return Math.max(0, expira - ahoraMs - MARGEN_RENOVACION_MS)
}

export function tokenSigueVigente(expiraEnIso: string, ahoraMs: number): boolean {
  const expira = Date.parse(expiraEnIso)
  return !Number.isNaN(expira) && expira > ahoraMs
}

/**
 * Ejecuta la acción y, si falla, la reintenta. `reintentos` son intentos adicionales
 * al primero. Entre ellos espera con el backoff indicado.
 */
export async function ejecutarConReintentos<T>(
  accion: () => Promise<T>,
  opciones: {
    reintentos: number
    esperasMs: readonly number[]
    esperar: (ms: number) => Promise<void>
  },
): Promise<T> {
  let ultimoError: unknown
  const intentos = opciones.reintentos + 1
  for (let indice = 0; indice < intentos; indice += 1) {
    try {
      return await accion()
    } catch (error) {
      ultimoError = error
      if (indice >= opciones.reintentos) break
      const espera = opciones.esperasMs[Math.min(indice, opciones.esperasMs.length - 1)] ?? 0
      await opciones.esperar(espera)
    }
  }
  throw ultimoError
}
