/**
 * Misma regla que Backend/src/dominio/periodo-academico.ts:
 * el semestre se lee en America/Bogota, no en el reloj local del navegador.
 * El valor por defecto de los formularios lo confirma GET /documentos/periodos/actual.
 */
export const ZONA_BOGOTA = 'America/Bogota'

export const FORMATO_PERIODO = /^\d{4}-[12]$/

const FORMATEADOR_BOGOTA = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONA_BOGOTA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function partesFechaBogota(fecha: Date): { anio: number; mes: number; dia: number } {
  const partes = FORMATEADOR_BOGOTA.formatToParts(fecha)
  const leer = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find((parte) => parte.type === tipo)?.value)
  return { anio: leer('year'), mes: leer('month'), dia: leer('day') }
}

/** Periodo académico en formato YYYY-1 (ene–jun) o YYYY-2 (jul–dic), en Bogotá. */
export function periodoAcademicoActual(fecha = new Date()): string {
  const { anio, mes } = partesFechaBogota(fecha)
  return `${anio}-${mes <= 6 ? 1 : 2}`
}

/** El query `periodo` manda si trae un periodo válido; si no, se usa el vigente. */
export function periodoSeleccionado(valorUrl: string | null | undefined, actual: string): string {
  if (valorUrl && FORMATO_PERIODO.test(valorUrl)) return valorUrl
  return actual
}

/**
 * El .docx puede mencionar otro periodo. No se sustituye el seleccionado:
 * se avisa y la persona decide.
 */
export function avisoPeriodoDocumento(
  periodoElegido: string,
  periodoDocumento?: string | null,
): string | null {
  if (!periodoDocumento || periodoDocumento === periodoElegido) return null
  return (
    `El documento indica el periodo ${periodoDocumento}, distinto del seleccionado (${periodoElegido}). ` +
    `Se conserva ${periodoElegido}. Cámbielo en la lista si el archivo corresponde a ${periodoDocumento}.`
  )
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
 * Usabilidad (28/10/2026): dos periodos por año. El selector muestra los del año actual
 * (calendario de Bogotá) y los de los años siguientes (por defecto uno).
 */
export function periodosVigentes(fecha = new Date(), aniosFuturos = 1): string[] {
  const { anio } = partesFechaBogota(fecha)
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
  const { anio } = partesFechaBogota(fecha)
  const esPasado = (p: string) => FORMATO_PERIODO.test(p) && Number(p.slice(0, 4)) < anio
  const historicos = new Set(periodosConDatos.filter(esPasado))
  if (seleccionado && esPasado(seleccionado)) historicos.add(seleccionado)
  // Periodos con datos de años futuros fuera del rango por defecto también se ofrecen.
  for (const p of periodosConDatos) {
    if (FORMATO_PERIODO.test(p) && !esPasado(p) && !vigentes.includes(p)) vigentes.push(p)
  }
  return {
    vigentes: vigentes.sort(),
    historicos: [...historicos].sort().toReversed(),
  }
}
