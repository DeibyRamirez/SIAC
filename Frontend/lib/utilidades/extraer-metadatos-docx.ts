import mammoth from 'mammoth'

import type { Programa } from '@/lib/tipos'
import { periodoAcademicoActual } from '@/lib/utilidades/periodo-academico'

export interface MetadatosExtraidosDocx {
  nombreSugerido?: string
  programaId?: string
  periodo?: string
}

function nombreDesdeArchivo(nombreArchivo: string): string {
  return nombreArchivo
    .replace(/\.docx$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
}

function buscarProgramaEnTexto(
  texto: string,
  programas: Programa[],
): Programa | undefined {
  const normalizado = texto.toLowerCase()
  return programas.find((p) => normalizado.includes(p.nombre.toLowerCase()))
}

function buscarPeriodo(texto: string, nombreArchivo: string): string | undefined {
  const fuente = `${texto} ${nombreArchivo}`
  const coincidencia = fuente.match(/20\d{2}-[12]/)
  return coincidencia?.[0]
}

export async function extraerMetadatosDocx(
  archivo: File,
  programas: Programa[],
): Promise<MetadatosExtraidosDocx> {
  const buffer = await archivo.arrayBuffer()
  const { value: texto } = await mammoth.extractRawText({
    arrayBuffer: buffer,
  })

  const programa = buscarProgramaEnTexto(texto, programas)
  const periodo =
    buscarPeriodo(texto, archivo.name) ?? periodoAcademicoActual()

  return {
    nombreSugerido: nombreDesdeArchivo(archivo.name),
    programaId: programa?.id,
    periodo,
  }
}

export { periodoAcademicoActual }
