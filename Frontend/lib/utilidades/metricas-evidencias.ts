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

/** Evidencias que el administrador puede ver en paneles (sin borradores internos del cargador). */
export function filtrarEvidenciasVisiblesAdministrador<T extends Pick<Evidencia, 'estado'>>(
  evidencias: T[],
): T[] {
  return evidencias.filter((e) => e.estado !== 'Borrador')
}

/**
 * Distribución para panel administrador: válidas, en revisión y en corrección.
 * No incluye borradores (RN visibilidad administrador).
 */
export function calcularDistribucionEstadosAdministrador(
  evidencias: Pick<Evidencia, 'estado'>[],
): { estado: string; valor: number; clave: string }[] {
  let validadas = 0
  let enRevision = 0
  let enCorreccion = 0
  for (const { estado } of filtrarEvidenciasVisiblesAdministrador(evidencias)) {
    if (estado === 'Validado' || estado === 'Cumple') validadas++
    else if (estado === 'EnRevision') enRevision++
    else if (estado === 'ConObservaciones' || estado === 'Rechazado') enCorreccion++
  }
  return [
    { estado: 'Validadas', valor: validadas, clave: 'validadas' },
    { estado: 'En revisión', valor: enRevision, clave: 'revision' },
    { estado: 'En corrección', valor: enCorreccion, clave: 'correccion' },
  ]
}

/** @deprecated Preferir calcularDistribucionEstadosAdministrador en rutas de administrador. */
export function calcularDistribucionEstados(
  evidencias: Pick<Evidencia, 'estado'>[],
): { estado: string; valor: number; clave: string }[] {
  return calcularDistribucionEstadosAdministrador(evidencias)
}
