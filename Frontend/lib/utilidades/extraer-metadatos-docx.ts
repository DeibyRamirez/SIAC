import mammoth from 'mammoth'

import type { Programa } from '@/lib/tipos'

export interface MetadatosExtraidosDocx {
  nombreSugerido?: string
  programaId?: string
  periodo?: string
  factor?: string
  indicador?: string
}

function periodoAcademicoActual(): string {
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const semestre = ahora.getMonth() < 6 ? 1 : 2
  return `${anio}-${semestre}`
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
  catalogoFactores: { factor: string; indicadores: string[] }[],
): Promise<MetadatosExtraidosDocx> {
  const buffer = await archivo.arrayBuffer()
  const { value: texto } = await mammoth.extractRawText({
    arrayBuffer: buffer,
  })

  const programa = buscarProgramaEnTexto(texto, programas)
  const periodo =
    buscarPeriodo(texto, archivo.name) ?? periodoAcademicoActual()

  let factor: string | undefined
  let indicador: string | undefined
  const textoLower = texto.toLowerCase()
  for (const item of catalogoFactores) {
    if (textoLower.includes(item.factor.toLowerCase().slice(0, 20))) {
      factor = item.factor
      indicador = item.indicadores[0]
      break
    }
  }

  return {
    nombreSugerido: nombreDesdeArchivo(archivo.name),
    programaId: programa?.id,
    periodo,
    factor,
    indicador,
  }
}

export { periodoAcademicoActual }
