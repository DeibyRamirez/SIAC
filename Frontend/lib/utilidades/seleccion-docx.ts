export interface SeleccionDocx {
  quote: string
  anchor: string
}

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

function aplicarResaltado(rango: Range): void {
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

  if (apiHighlight && resaltados) {
    resaltados.set('siac-comentario', new apiHighlight(rango))
    window.setTimeout(() => resaltados.delete('siac-comentario'), 2400)
    return
  }

  try {
    const marca = document.createElement('mark')
    marca.style.backgroundColor = '#fde68a'
    rango.surroundContents(marca)
    window.setTimeout(() => {
      const padre = marca.parentNode
      if (padre) {
        padre.replaceChild(document.createTextNode(marca.textContent ?? ''), marca)
        padre.normalize()
      }
    }, 2400)
  } catch {
    // Rango multiparágrafo: solo se hará scroll.
  }
}

function rangoDesdeCita(
  contenedor: HTMLElement,
  cita: { anchor?: string; quote?: string },
): Range | null {
  if (cita.anchor) {
    const [inicioTexto, finTexto] = cita.anchor.split(':')
    const start = Number(inicioTexto)
    const end = Number(finTexto)
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      const rango = rangoPorOffsets(contenedor, start, end)
      if (rango) return rango
    }
  }
  const quote = cita.quote?.trim()
  if (!quote) return null
  const texto = contenedor.textContent ?? ''
  const indice = texto.indexOf(quote)
  if (indice < 0) return null
  return rangoPorOffsets(contenedor, indice, indice + quote.length)
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
 * buscando el quote en el texto del documento.
 */
export function resaltarCita(
  contenedor: HTMLElement,
  cita: { anchor?: string; quote?: string },
): boolean {
  const rango = rangoDesdeCita(contenedor, cita)
  if (!rango) return false
  const elemento =
    rango.startContainer.nodeType === Node.TEXT_NODE
      ? rango.startContainer.parentElement
      : (rango.startContainer as HTMLElement)
  elemento?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  aplicarResaltado(rango)
  return true
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
