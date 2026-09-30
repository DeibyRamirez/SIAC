import type { Evidencia } from '@/lib/tipos'

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** Evidencias cargadas por mes en los últimos `meses` meses (incluye el actual). */
export function calcularTendenciaMensual(
  evidencias: Pick<Evidencia, 'fechaCarga'>[],
  meses = 6,
  hoy: Date = new Date(),
): { mes: string; evidencias: number }[] {
  const conteo = new Map<string, number>()
  for (const evidencia of evidencias) {
    const clave = evidencia.fechaCarga?.slice(0, 7)
    if (clave) conteo.set(clave, (conteo.get(clave) ?? 0) + 1)
  }

  const serie: { mes: string; evidencias: number }[] = []
  for (let desplazamiento = meses - 1; desplazamiento >= 0; desplazamiento--) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - desplazamiento, 1)
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
    serie.push({ mes: MESES_CORTOS[fecha.getMonth()], evidencias: conteo.get(clave) ?? 0 })
  }
  return serie
}

export function calcularDistribucionEstados(
  evidencias: Pick<Evidencia, 'estado'>[],
): { estado: string; valor: number; clave: string }[] {
  let validadas = 0
  let enRevision = 0
  let borrador = 0
  for (const { estado } of evidencias) {
    if (estado === 'Validado' || estado === 'Cumple') validadas++
    else if (estado === 'EnRevision') enRevision++
    else if (estado === 'Borrador') borrador++
  }
  return [
    { estado: 'Validadas', valor: validadas, clave: 'validadas' },
    { estado: 'En revisión', valor: enRevision, clave: 'revision' },
    { estado: 'Borrador', valor: borrador, clave: 'borrador' },
  ]
}
