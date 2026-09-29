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
