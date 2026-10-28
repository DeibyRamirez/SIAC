/** Periodo académico en formato YYYY-1 (ene–jun) o YYYY-2 (jul–dic). */
export function periodoAcademicoActual(fecha = new Date()): string {
  const anio = fecha.getFullYear()
  const semestre = fecha.getMonth() < 6 ? 1 : 2
  return `${anio}-${semestre}`
}

/** Genera periodos desde un año inicial hasta el actual (incluye semestre vigente). */
export function generarPeriodosAcademicos(desdeAnio = 2024): string[] {
  const actual = periodoAcademicoActual()
  const [anioFin, semFin] = actual.split('-').map(Number)
  const periodos: string[] = []
  for (let anio = desdeAnio; anio <= anioFin; anio++) {
    const maxSem = anio === anioFin ? semFin : 2
    for (let sem = 1; sem <= maxSem; sem++) {
      periodos.push(`${anio}-${sem}`)
    }
  }
  return periodos.toReversed()
}

/** Lista de periodos con el actual primero y sin duplicados. */
export function periodosConActual(desdeAnio = 2024): string[] {
  const actual = periodoAcademicoActual()
  const todos = generarPeriodosAcademicos(desdeAnio)
  return [actual, ...todos.filter((p) => p !== actual)]
}

/**
 * Usabilidad (28/10/2026): dos periodos por año. El selector muestra solo los del año actual y
 * los de los años siguientes (por defecto uno), no años pasados.
 */
export function periodosVigentes(fecha = new Date(), aniosFuturos = 1): string[] {
  const anio = fecha.getFullYear()
  const periodos: string[] = []
  for (let a = anio; a <= anio + aniosFuturos; a++) {
    periodos.push(`${a}-1`, `${a}-2`)
  }
  return periodos
}

export interface GruposPeriodos {
  /** Año actual y siguientes (siempre visibles). */
  vigentes: string[]
  /** Periodos de años pasados que tienen documentos (o el que llega por URL). */
  historicos: string[]
}

/**
 * Separa los periodos vigentes de los históricos. Un periodo pasado solo aparece si tiene datos
 * o si es el seleccionado actualmente (p. ej. `?periodo=2024-2` en la URL), para que los
 * documentos antiguos sigan accesibles.
 */
export function agruparPeriodos(
  periodosConDatos: string[],
  fecha = new Date(),
  seleccionado?: string | null,
): GruposPeriodos {
  const vigentes = periodosVigentes(fecha)
  const anio = fecha.getFullYear()
  const esPasado = (p: string) => /^\d{4}-[12]$/.test(p) && Number(p.slice(0, 4)) < anio
  const historicos = new Set(periodosConDatos.filter(esPasado))
  if (seleccionado && esPasado(seleccionado)) historicos.add(seleccionado)
  // Periodos con datos de años futuros fuera del rango por defecto también se ofrecen.
  for (const p of periodosConDatos) {
    if (/^\d{4}-[12]$/.test(p) && !esPasado(p) && !vigentes.includes(p)) vigentes.push(p)
  }
  return {
    vigentes: vigentes.sort(),
    historicos: [...historicos].sort().reverse(),
  }
}
