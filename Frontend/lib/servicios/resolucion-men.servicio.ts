import { peticionApi } from './cliente-api'

/** Respuesta del registro de la resolución MEN (fin de vigencia calculado en el backend). */
export interface ResolucionMenRegistrada {
  id: string
  numero: string
  fechaResolucion: string
  fechaFinVigencia: string
  semaforoVigencia: 'Verde' | 'Amarillo' | 'Rojo' | 'SinVigencia'
}

export interface DatosResolucionMen {
  numero: string
  /** AAAA-MM-DD, fecha real de la resolución. */
  fechaResolucion: string
  archivo: File
}

/**
 * Carga la resolución MEN (solo PDF) del programa o, sin programaId, de la institución.
 * El backend responde 409 si el trámite todavía tiene documentos sin aprobar.
 */
export async function cargarResolucionMenApi(
  destino: { programaId: string } | { institucion: true },
  datos: DatosResolucionMen,
): Promise<ResolucionMenRegistrada> {
  const formulario = new FormData()
  formulario.append('numero', datos.numero.trim())
  formulario.append('fechaResolucion', datos.fechaResolucion)
  formulario.append('archivo', datos.archivo)
  const ruta = 'programaId' in destino ? `/programas/${destino.programaId}/resolucion` : '/institucion/resolucion'
  return peticionApi<ResolucionMenRegistrada>(ruta, { method: 'POST', body: formulario })
}
