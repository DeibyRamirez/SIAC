export interface SeleccionDocx {
  quote: string
  anchor: string
}

export interface ResultadoResaltado {
  encontrado: boolean
  /** Quita la marca de inmediato (cambio de comentario o desmontaje). Idempotente. */
  limpiar: () => void
}

/** El resaltado de un comentario se retira solo a los 10 s, como pide la experiencia del profesor. */
export const DURACION_RESALTADO_COMENTARIO_MS = 10_000

/** Deja una sola marca activa aunque se pulse otro comentario antes de que expire. */
let limpiarResaltadoVigente: (() => void) | null = null

function offsetEnContenedor(
  contenedor: HTMLElement,
  nodo: Node,
  offset: number,
): number {
  const rango = document.createRange()
  rango.selectNodeContents(contenedor)
  rango.setEnd(nodo, offset)
  return rango.toString().length
}

function rangoPorOffsets(
  contenedor: HTMLElement,
  start: number,
  end: number,
): Range | null {
  const caminante = document.createTreeWalker(contenedor, NodeFilter.SHOW_TEXT)
  let acumulado = 0
  let nodoInicio: Node | null = null
  let offsetInicio = 0
  let nodoFin: Node | null = null
  let offsetFin = 0
  let nodo: Node | null = caminante.nextNode()
  while (nodo) {
    const longitud = (nodo.textContent ?? '').length
    if (!nodoInicio && acumulado + longitud >= start) {
      nodoInicio = nodo
      offsetInicio = start - acumulado
    }
    if (!nodoFin && acumulado + longitud >= end) {
      nodoFin = nodo
      offsetFin = end - acumulado
      break
    }
    acumulado += longitud
    nodo = caminante.nextNode()
  }
  if (!nodoInicio || !nodoFin) return null
  const rango = document.createRange()
  rango.setStart(nodoInicio, offsetInicio)
  rango.setEnd(nodoFin, offsetFin)
  return rango
}

/** Captura la selección actual dentro del contenedor como quote + ancla de offsets. */
export function capturarSeleccion(contenedor: HTMLElement): SeleccionDocx | null {
  if (typeof window === 'undefined') return null
  const seleccion = window.getSelection()
  if (!seleccion || seleccion.rangeCount === 0 || seleccion.isCollapsed) return null

  const rango = seleccion.getRangeAt(0)
  if (!contenedor.contains(rango.commonAncestorContainer)) return null

  const texto = rango.toString()
  const quote = texto.replace(/\s+/g, ' ').trim()
  if (quote.length < 2) return null

  const inicioBruto = offsetEnContenedor(
    contenedor,
    rango.startContainer,
    rango.startOffset,
  )
  const finBruto = offsetEnContenedor(
    contenedor,
    rango.endContainer,
    rango.endOffset,
  )
  const espaciosInicio = texto.length - texto.replace(/^\s+/, '').length
  const espaciosFin = texto.length - texto.replace(/\s+$/, '').length
  const start = inicioBruto + espaciosInicio
  const end = Math.max(start + 1, finBruto - espaciosFin)

  return { quote, anchor: `${start}:${end}` }
}

function normalizarTexto(texto: string): string {
  return texto
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es')
}

const ETIQUETAS_BLOQUE = new Set([
  'ADDRESS',
  'ARTICLE',
  'BLOCKQUOTE',
  'DIV',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'LI',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'TD',
  'TH',
  'TR',
  'UL',
])

function bloqueDe(nodo: Node, contenedor: HTMLElement): Node {
  let elemento = nodo.parentElement
  while (elemento && elemento !== contenedor) {
    if (ETIQUETAS_BLOQUE.has(elemento.tagName)) return elemento
    elemento = elemento.parentElement
  }
  return contenedor
}

function haySaltoDeLineaEntre(anterior: Node, actual: Node): boolean {
  const rango = document.createRange()
  rango.setStartAfter(anterior)
  rango.setEndBefore(actual)
  return Boolean(rango.cloneContents().querySelector('br'))
}

/**
 * Texto normalizado del contenedor y mapa de cada carácter normalizado a su offset
 * en el texto original. La normalización colapsa espacios/saltos de línea y unifica
 * mayúsculas para que una cita capturada en Word siga encontrándose en el preview.
 */
function textoNormalizadoConMapa(contenedor: HTMLElement): {
  texto: string
  mapa: number[]
} {
  const caminante = document.createTreeWalker(contenedor, NodeFilter.SHOW_TEXT)
  let texto = ''
  const mapa: number[] = []
  let offsetOriginal = 0
  let nodoAnterior: Node | null = null
  let nodo = caminante.nextNode()

  while (nodo) {
    const contenido = nodo.textContent ?? ''
    const bloqueAnterior = nodoAnterior ? bloqueDe(nodoAnterior, contenedor) : null
    const bloqueActual = bloqueDe(nodo, contenedor)
    const cambiaDeBloque = Boolean(nodoAnterior && bloqueAnterior !== bloqueActual)
    const saltoDeLinea =
      nodoAnterior !== null &&
      !cambiaDeBloque &&
      haySaltoDeLineaEntre(nodoAnterior, nodo)
    const necesitaSeparador =
      Boolean(nodoAnterior) &&
      (cambiaDeBloque || saltoDeLinea) &&
      texto.length > 0 &&
      texto[texto.length - 1] !== ' ' &&
      contenido.length > 0 &&
      !/^\s/.test(contenido)
    if (necesitaSeparador) {
      texto += ' '
      mapa.push(offsetOriginal)
    }

    for (let indice = 0; indice < contenido.length; indice += 1) {
      const caracter = contenido[indice]
      if (/\s/.test(caracter)) {
        if (texto.length > 0 && texto[texto.length - 1] !== ' ') {
          texto += ' '
          mapa.push(offsetOriginal + indice)
        }
      } else {
        texto += caracter.toLocaleLowerCase('es')
        mapa.push(offsetOriginal + indice)
      }
    }
    offsetOriginal += contenido.length
    nodoAnterior = nodo
    nodo = caminante.nextNode()
  }

  let inicio = 0
  let fin = texto.length
  while (inicio < fin && texto[inicio] === ' ') inicio += 1
  while (fin > inicio && texto[fin - 1] === ' ') fin -= 1

  return { texto: texto.slice(inicio, fin), mapa: mapa.slice(inicio, fin) }
}

function rangoDesdeCitaNormalizada(
  contenedor: HTMLElement,
  quote: string,
): Range | null {
  const buscada = normalizarTexto(quote)
  if (!buscada) return null
  const { texto, mapa } = textoNormalizadoConMapa(contenedor)
  const indice = texto.indexOf(buscada)
  if (indice < 0) return null
  const inicio = mapa[indice]
  const fin = mapa[indice + buscada.length - 1] + 1
  if (!Number.isFinite(inicio) || !Number.isFinite(fin) || fin <= inicio) return null
  return rangoPorOffsets(contenedor, inicio, fin)
}

function rangosPorNodoTexto(rango: Range): Array<{ nodo: Text; inicio: number; fin: number }> {
  const comun = rango.commonAncestorContainer
  const raiz = comun.nodeType === Node.TEXT_NODE ? comun.parentNode : comun
  if (!raiz) return []

  const caminante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
  const segmentos: Array<{ nodo: Text; inicio: number; fin: number }> = []
  let nodo = caminante.nextNode() as Text | null

  while (nodo) {
    if (rango.intersectsNode(nodo)) {
      const longitud = nodo.textContent?.length ?? 0
      const inicio = nodo === rango.startContainer ? rango.startOffset : 0
      const fin = nodo === rango.endContainer ? rango.endOffset : longitud
      const tramo = (nodo.textContent ?? '').slice(inicio, fin)
      if (fin > inicio && tramo.trim().length > 0) {
        segmentos.push({ nodo, inicio, fin })
      }
    }
    nodo = caminante.nextNode() as Text | null
  }

  return segmentos
}

/**
 * Envuelve cada tramo de texto del rango en un <mark data-siac-cita>. Al trabajar por
 * nodos de texto permite citas que cruzan párrafos, donde `surroundContents` falla.
 */
function marcarRangoPorNodos(rango: Range): Array<HTMLElement> {
  const marcas: Array<HTMLElement> = []
  for (const segmento of rangosPorNodoTexto(rango)) {
    try {
      const tramo = document.createRange()
      tramo.setStart(segmento.nodo, segmento.inicio)
      tramo.setEnd(segmento.nodo, segmento.fin)
      const marca = document.createElement('mark')
      marca.dataset.siacCita = ''
      marca.style.backgroundColor = '#fde68a'
      marca.style.boxShadow = '0 0 0 2px rgba(202, 138, 4, 0.75)'
      tramo.surroundContents(marca)
      marcas.push(marca)
    } catch {
      // El tramo puede haber quedado parcialmente seleccionado por otro mark; se omite.
    }
  }
  return marcas
}

function quitarMarcas(marcas: Array<HTMLElement>): void {
  for (const marca of marcas) {
    const padre = marca.parentNode
    if (!padre) continue
    padre.replaceChild(document.createTextNode(marca.textContent ?? ''), marca)
    padre.normalize()
  }
}

function aplicarResaltado(
  rango: Range,
  duracionMs = DURACION_RESALTADO_COMENTARIO_MS,
): () => void {
  limpiarResaltadoVigente?.()

  const apiHighlight = (
    globalThis as {
      Highlight?: new (...rangos: Range[]) => unknown
    }
  ).Highlight
  const resaltados = (
    CSS as unknown as {
      highlights?: {
        set: (nombre: string, valor: unknown) => void
        delete: (nombre: string) => void
      }
    }
  ).highlights

  let activo = true
  let temporizador: number | undefined
  const marcas = apiHighlight && resaltados ? [] : marcarRangoPorNodos(rango)

  const limpiar = () => {
    if (!activo) return
    activo = false
    if (temporizador !== undefined) window.clearTimeout(temporizador)
    if (apiHighlight && resaltados) {
      resaltados.delete('siac-comentario')
    }
    quitarMarcas(marcas)
    if (limpiarResaltadoVigente === limpiar) limpiarResaltadoVigente = null
  }

  if (apiHighlight && resaltados) {
    resaltados.set('siac-comentario', new apiHighlight(rango))
  }

  temporizador = window.setTimeout(limpiar, duracionMs)
  limpiarResaltadoVigente = limpiar
  return limpiar
}

function rangoDesdeCita(
  contenedor: HTMLElement,
  cita: { anchor?: string; quote?: string },
): Range | null {
  const quote = cita.quote?.trim()
  if (cita.anchor) {
    const [inicioTexto, finTexto] = cita.anchor.split(':')
    const start = Number(inicioTexto)
    const end = Number(finTexto)
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      const rango = rangoPorOffsets(contenedor, start, end)
      // El offset solo es confiable si el texto del rango sigue coincidiendo con la cita.
      if (rango && (!quote || normalizarTexto(rango.toString()) === normalizarTexto(quote))) {
        return rango
      }
    }
  }
  if (!quote) return null
  return rangoDesdeCitaNormalizada(contenedor, quote)
}

/** Desplaza la vista al rango y lo resalta temporalmente. Devuelve si el ancla fue válida. */
export function resaltarAncla(contenedor: HTMLElement, anchor: string): boolean {
  const [inicioTexto, finTexto] = anchor.split(':')
  const start = Number(inicioTexto)
  const end = Number(finTexto)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false

  const rango = rangoPorOffsets(contenedor, start, end)
  if (!rango) return false

  const elemento =
    rango.startContainer.nodeType === Node.TEXT_NODE
      ? rango.startContainer.parentElement
      : (rango.startContainer as HTMLElement)
  elemento?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  aplicarResaltado(rango)
  return true
}

/**
 * Resalta una cita intentando primero el ancla de offsets y, si falla,
 * buscando la cita normalizada en el texto del documento. Devuelve cómo
 * retirar la marca (10 s o al cambiar de comentario).
 */
export function resaltarCita(
  contenedor: HTMLElement,
  cita: { anchor?: string; quote?: string },
): ResultadoResaltado {
  const rango = rangoDesdeCita(contenedor, cita)
  if (!rango) {
    return { encontrado: false, limpiar: () => undefined }
  }
  const elemento =
    rango.startContainer.nodeType === Node.TEXT_NODE
      ? rango.startContainer.parentElement
      : (rango.startContainer as HTMLElement)
  elemento?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  return { encontrado: true, limpiar: aplicarResaltado(rango) }
}

interface ApiResaltados {
  set: (nombre: string, valor: unknown) => void
  delete: (nombre: string) => void
}

function apiHighlightDisponible(): {
  Highlight?: new (...rangos: Range[]) => unknown
  resaltados?: ApiResaltados
} {
  return {
    Highlight: (
      globalThis as { Highlight?: new (...rangos: Range[]) => unknown }
    ).Highlight,
    resaltados: (CSS as unknown as { highlights?: ApiResaltados }).highlights,
  }
}

/** Aplica un resaltado persistente a todas las citas resolubles (CSS Highlight API). */
export function aplicarResaltadosCitas(
  contenedor: HTMLElement,
  citas: { anchor?: string; quote?: string }[],
): void {
  const { Highlight, resaltados } = apiHighlightDisponible()
  if (!Highlight || !resaltados) return
  const rangos = citas
    .map((cita) => rangoDesdeCita(contenedor, cita))
    .filter((rango): rango is Range => rango !== null)
  if (rangos.length === 0) {
    resaltados.delete('siac-citas')
    return
  }
  resaltados.set('siac-citas', new Highlight(...rangos))
}

export function limpiarResaltadosCitas(): void {
  apiHighlightDisponible().resaltados?.delete('siac-citas')
}
