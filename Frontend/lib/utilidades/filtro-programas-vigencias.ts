import { obtenerProgresoProgramaApi } from '@/lib/servicios/progreso-programa.servicio'
import type { Programa } from '@/lib/tipos'

const CONCURRENCIA = 4

/** Programa con trámite documental incompleto (aún puede cargar anexos de vigencia). */
export function programaElegibleParaVigenciasPorProgreso(
  avanceGlobal: number,
  puedeCargarResolucion?: boolean,
): boolean {
  if (puedeCargarResolucion === true) return false
  return avanceGlobal < 100
}

async function mapaElegibilidadProgramas(
  programas: ReadonlyArray<Pick<Programa, 'id'>>,
): Promise<Map<string, boolean>> {
  const resultado = new Map<string, boolean>()
  const cola = [...programas]

  async function worker() {
    while (cola.length > 0) {
      const programa = cola.shift()
      if (!programa) return
      try {
        const progreso = await obtenerProgresoProgramaApi(programa.id)
        resultado.set(
          programa.id,
          programaElegibleParaVigenciasPorProgreso(
            progreso.avanceGlobal,
            progreso.puedeCargarResolucion,
          ),
        )
      } catch {
        resultado.set(programa.id, true)
      }
    }
  }

  const trabajadores = Array.from({ length: Math.min(CONCURRENCIA, programas.length) }, () =>
    worker(),
  )
  await Promise.all(trabajadores)
  return resultado
}

/** Filtra programas cuyo trámite activo no está al 100 % documental. */
export async function programasElegiblesParaVigencias<T extends Pick<Programa, 'id'>>(
  programas: readonly T[],
): Promise<T[]> {
  if (programas.length === 0) return []
  const elegibles = await mapaElegibilidadProgramas(programas)
  return programas.filter((p) => elegibles.get(p.id) !== false)
}

/** Programas en los que el cargador aún puede subir guías G1–G2 (misma regla que vigencias). */
export async function programasElegiblesParaCargaEvidencia<T extends Pick<Programa, 'id'>>(
  programas: readonly T[],
): Promise<T[]> {
  return programasElegiblesParaVigencias(programas)
}
