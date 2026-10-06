import type { CategoriaAnexo } from '@/lib/tipos'

export const CATEGORIAS_ANEXO: { valor: CategoriaAnexo; etiqueta: string }[] = [
  { valor: 'Infraestructura', etiqueta: 'Infraestructura (RN-003)' },
  { valor: 'Permiso', etiqueta: 'Permiso' },
  { valor: 'Convenio', etiqueta: 'Convenio' },
  { valor: 'Otro', etiqueta: 'Otro' },
]

export interface FormularioAnexo {
  titulo: string
  programaId: string
  categoria: CategoriaAnexo
  evidenciaId: string
  /** Fecha de vencimiento que trae el certificado (AAAA-MM-DD). */
  fechaVencimiento: string
  /** Alternativa: fecha de expedición + años de vigencia. */
  fechaExpedicion: string
  aniosVigencia: string
  carpeta: string
  responsable: string
}

export const FORMULARIO_ANEXO_INICIAL: FormularioAnexo = {
  titulo: '',
  programaId: '',
  categoria: 'Infraestructura',
  evidenciaId: '',
  fechaVencimiento: '',
  fechaExpedicion: '',
  aniosVigencia: '',
  carpeta: 'infraestructura',
  responsable: '',
}

/**
 * Valida el formulario del anexo (documento y evidencia obligatorios, vencimiento desde el
 * certificado) y arma el multipart para POST /vigencias/con-archivo.
 */
export function construirFormularioAnexo(
  formulario: FormularioAnexo,
  archivo: File | null,
): { error: string } | { formData: FormData } {
  if (!formulario.titulo.trim() || !formulario.responsable.trim()) {
    return { error: 'Complete el título y el responsable.' }
  }
  if (!formulario.programaId) return { error: 'Seleccione el programa.' }
  if (!formulario.evidenciaId) return { error: 'Vincule el anexo a la evidencia que respalda.' }
  if (!archivo) return { error: 'Adjunte el documento del anexo.' }
  const usaExpedicion = !formulario.fechaVencimiento && formulario.fechaExpedicion && formulario.aniosVigencia
  if (!formulario.fechaVencimiento && !usaExpedicion) {
    return { error: 'Indique la fecha de vencimiento del certificado o su expedición y los años de vigencia.' }
  }

  const formData = new FormData()
  formData.append('titulo', formulario.titulo.trim())
  formData.append('programaId', formulario.programaId)
  formData.append('categoria', formulario.categoria)
  formData.append('evidenciaId', formulario.evidenciaId)
  if (formulario.fechaVencimiento) formData.append('fechaVencimiento', formulario.fechaVencimiento)
  if (formulario.fechaExpedicion) formData.append('fechaExpedicion', formulario.fechaExpedicion)
  if (usaExpedicion) formData.append('aniosVigencia', formulario.aniosVigencia)
  formData.append('carpeta', formulario.carpeta.trim() || 'general')
  formData.append('responsable', formulario.responsable.trim())
  formData.append('archivo', archivo)
  return { formData }
}
