const RUTA_CORE = 'docProps/core.xml'
const RUTA_CONTENT_TYPES = '[Content_Types].xml'
const RUTA_DOCUMENTO = 'word/document.xml'
const FIRMA_REGEX = /SIAC_FIRMA_VERSION=([^;\s<]+)/

const FIRMA_CENTRAL = 0x02014b50
const FIN_CENTRAL = 0x06054b50
const CABECERA_LOCAL = 0x04034b50

export interface InspeccionFirmaDocx {
  /** El buffer es un ZIP legible. */
  esZipValido: boolean
  /** El ZIP contiene las partes mínimas de un .docx OPC. */
  esDocxValido: boolean
  /** Token SIAC encontrado en docProps/core.xml (null si no existe). */
  firma: string | null
}

interface ContenidoZip {
  esZip: boolean
  esDocx: boolean
  core: string | null
}

/**
 * Inspecciona un .docx: valida el contenedor ZIP/OPC y lee el token de firma
 * SIAC de docProps/core.xml. Un ZIP válido sin core.xml NO se reporta como
 * inválido: solo queda sin firma. No depende de librerías externas.
 */
export async function inspeccionarFirmaDocx(
  archivo: Blob,
): Promise<InspeccionFirmaDocx> {
  let buffer: ArrayBuffer
  try {
    buffer = await archivo.arrayBuffer()
  } catch {
    return { esZipValido: false, esDocxValido: false, firma: null }
  }

  const { esZip, esDocx, core } = await extraerZip(buffer)
  if (!esZip) {
    return { esZipValido: false, esDocxValido: false, firma: null }
  }
  const firma = core?.match(FIRMA_REGEX)?.[1]?.trim() ?? null
  return { esZipValido: true, esDocxValido: esDocx, firma }
}

async function extraerZip(buffer: ArrayBuffer): Promise<ContenidoZip> {
  const datos = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  const eocd = buscarFinDirectorioCentral(datos)
  if (eocd < 0) return { esZip: false, esDocx: false, core: null }

  try {
    const totalEntradas = datos.getUint16(eocd + 10, true)
    let offset = datos.getUint32(eocd + 16, true)

    let tieneContentTypes = false
    let tieneDocumento = false
    let core: string | null = null

    for (let i = 0; i < totalEntradas; i += 1) {
      if (offset + 46 > datos.byteLength) break
      if (datos.getUint32(offset, true) !== FIRMA_CENTRAL) break

      const metodo = datos.getUint16(offset + 10, true)
      const tamComprimido = datos.getUint32(offset + 20, true)
      const longitudNombre = datos.getUint16(offset + 28, true)
      const longitudExtra = datos.getUint16(offset + 30, true)
      const longitudComentario = datos.getUint16(offset + 32, true)
      const offsetLocal = datos.getUint32(offset + 42, true)

      const inicioNombre = offset + 46
      const nombre = new TextDecoder().decode(
        bytes.subarray(inicioNombre, inicioNombre + longitudNombre),
      )

      if (nombre === RUTA_CONTENT_TYPES) tieneContentTypes = true
      if (nombre === RUTA_DOCUMENTO) tieneDocumento = true
      if (nombre === RUTA_CORE && core === null) {
        core = await leerContenidoLocal(
          datos,
          bytes,
          offsetLocal,
          metodo,
          tamComprimido,
        )
      }

      offset += 46 + longitudNombre + longitudExtra + longitudComentario
    }

    return {
      esZip: true,
      esDocx: tieneContentTypes && tieneDocumento,
      core,
    }
  } catch {
    return { esZip: true, esDocx: false, core: null }
  }
}

async function leerContenidoLocal(
  datos: DataView,
  bytes: Uint8Array,
  offsetLocal: number,
  metodo: number,
  tamComprimido: number,
): Promise<string | null> {
  try {
    if (offsetLocal + 30 > datos.byteLength) return null
    if (datos.getUint32(offsetLocal, true) !== CABECERA_LOCAL) return null

    const longitudNombre = datos.getUint16(offsetLocal + 26, true)
    const longitudExtra = datos.getUint16(offsetLocal + 28, true)
    const inicioDatos = offsetLocal + 30 + longitudNombre + longitudExtra
    const finDatos = inicioDatos + tamComprimido
    if (finDatos > bytes.byteLength) return null

    const crudo = bytes.subarray(inicioDatos, finDatos)
    if (metodo === 0) return new TextDecoder().decode(crudo)
    if (metodo === 8) return await descomprimirDeflate(crudo)
    return null
  } catch {
    return null
  }
}

function buscarFinDirectorioCentral(datos: DataView): number {
  const longitud = datos.byteLength
  if (longitud < 22) return -1
  const minimo = Math.max(0, longitud - 0xffff - 22)
  for (let i = longitud - 22; i >= minimo; i -= 1) {
    if (datos.getUint32(i, true) === FIN_CENTRAL) return i
  }
  return -1
}

async function descomprimirDeflate(crudo: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream no disponible')
  }
  const copia = new ArrayBuffer(crudo.byteLength)
  new Uint8Array(copia).set(crudo)
  const flujo = new Blob([copia])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  return await new Response(flujo).text()
}
