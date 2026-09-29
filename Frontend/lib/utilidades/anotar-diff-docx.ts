export interface LineaAnotacion {
  tipo: 'contexto' | 'agregado' | 'eliminado'
  texto: string
}

interface NodoTextoMapa {
  nodo: Text
  inicio: number
  fin: number
}

interface MapaTexto {
  texto: string
  nodos: NodoTextoMapa[]
  normalizado: string
  aCrudo: number[]
}

const ATRIBUTO_MARCA = 'data-siac-cambio'

function normalizar(texto: string): string {
  return texto.replace(/[\s\u00ad\u200b]+/g, ' ').trim()
}

function construirMapa(contenedor: HTMLElement): MapaTexto {
  const walker = document.createTreeWalker(contenedor, NodeFilter.SHOW_TEXT)
  const nodos: NodoTextoMapa[] = []
  let texto = ''
  let nodo = walker.nextNode()
  while (nodo) {
    const contenido = nodo.textContent ?? ''
    if (contenido.length > 0) {
      nodos.push({
        nodo: nodo as Text,
        inicio: texto.length,
        fin: texto.length + contenido.length,
      })
      texto += contenido
    }
    nodo = walker.nextNode()
  }

  let normalizado = ''
  const aCrudo: number[] = []
  let enEspacio = false
  for (let i = 0; i < texto.length; i += 1) {
    const caracter = texto[i]
    if (/\s/.test(caracter) || caracter === '\u00ad' || caracter === '\u200b') {
      if (!enEspacio) {
        normalizado += ' '
        aCrudo.push(i)
        enEspacio = true
      }
    } else {
      normalizado += caracter
      aCrudo.push(i)
      enEspacio = false
    }
  }

  return { texto, nodos, normalizado, aCrudo }
}

function rangoPorOffsets(
  contenedor: HTMLElement,
  start: number,
  end: number,
): Range | null {
  const walker = document.createTreeWalker(contenedor, NodeFilter.SHOW_TEXT)
  let acumulado = 0
  let nodoInicio: Node | null = null
  let offsetInicio = 0
  let nodoFin: Node | null = null
  let offsetFin = 0
  let nodo = walker.nextNode()
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
    nodo = walker.nextNode()
  }
  if (!nodoInicio || !nodoFin) return null
  const rango = document.createRange()
  rango.setStart(nodoInicio, offsetInicio)
  rango.setEnd(nodoFin, offsetFin)
  return rango
}

function nodosTextoEnRango(
  rango: Range,
): { nodo: Text; inicio: number; fin: number }[] {
  const raiz =
    rango.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? (rango.commonAncestorContainer.parentNode ??
        rango.commonAncestorContainer)
      : rango.commonAncestorContainer
  const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
  const lista: { nodo: Text; inicio: number; fin: number }[] = []
  let nodo = walker.nextNode()
  while (nodo) {
    const texto = nodo as Text
    if (rango.intersectsNode(texto)) {
      const longitud = texto.textContent?.length ?? 0
      const inicio = texto === rango.startContainer ? rango.startOffset : 0
      const fin = texto === rango.endContainer ? rango.endOffset : longitud
      if (inicio < fin) lista.push({ nodo: texto, inicio, fin })
    }
    nodo = walker.nextNode()
  }
  return lista
}

function envolverRango(rango: Range, etiqueta: 'ins' | 'del'): boolean {
  const nodos = nodosTextoEnRango(rango)
  if (nodos.length === 0) return false
  let aplicado = false
  for (const { nodo, inicio, fin } of nodos) {
    const sub = document.createRange()
    sub.setStart(nodo, inicio)
    sub.setEnd(nodo, fin)
    const marca = document.createElement(etiqueta)
    marca.setAttribute(ATRIBUTO_MARCA, etiqueta)
    try {
      sub.surroundContents(marca)
      aplicado = true
    } catch {
      // Fragmento no envolvible sin romper estructura: se degrada ese tramo.
    }
  }
  return aplicado
}

function insertarEliminado(rango: Range, texto: string): boolean {
  const marca = document.createElement('del')
  marca.setAttribute(ATRIBUTO_MARCA, 'eliminado')
  marca.textContent = texto
  try {
    const copia = rango.cloneRange()
    copia.collapse(true)
    copia.insertNode(marca)
    return true
  } catch {
    return false
  }
}

/**
 * Superpone marcas inline (ins/del) sobre el DOM ya renderizado del .docx,
 * preservando tablas, títulos y layout. Usa `lineas` del diff como guía.
 * Devuelve cuántas marcas se aplicaron.
 */
export function anotarCambiosEnPreview(
  contenedor: HTMLElement,
  lineas: LineaAnotacion[],
): number {
  const mapa = construirMapa(contenedor)
  if (!mapa.texto) return 0

  const anotaciones: {
    tipo: 'agregado' | 'eliminado'
    start: number
    end: number
    texto: string
  }[] = []

  let cursor = 0
  let cursorValido = true
  let eliminadosPendientes: string[] = []

  const flushEliminados = () => {
    if (eliminadosPendientes.length === 0) return
    if (cursorValido) {
      const posicion =
        cursor < mapa.aCrudo.length ? mapa.aCrudo[cursor] : mapa.texto.length
      anotaciones.push({
        tipo: 'eliminado',
        start: posicion,
        end: posicion,
        texto: eliminadosPendientes.join(' '),
      })
    }
    eliminadosPendientes = []
  }

  for (const linea of lineas) {
    const objetivo = normalizar(linea.texto)
    if (!objetivo) continue

    if (linea.tipo === 'eliminado') {
      eliminadosPendientes.push(linea.texto.trim())
      continue
    }

    flushEliminados()

    let indice = mapa.normalizado.indexOf(objetivo, cursor)
    if (indice < 0) indice = mapa.normalizado.indexOf(objetivo)
    if (indice < 0 && objetivo.length > 40) {
      const recorte = objetivo.slice(0, 40)
      indice = mapa.normalizado.indexOf(recorte, cursor)
      if (indice < 0) indice = mapa.normalizado.indexOf(recorte)
    }
    if (indice < 0) {
      cursorValido = false
      continue
    }

    const finNormalizado = Math.min(
      indice + objetivo.length,
      mapa.aCrudo.length,
    )
    const start = mapa.aCrudo[indice]
    const end = mapa.aCrudo[finNormalizado - 1] + 1

    if (linea.tipo === 'agregado' && end > start) {
      anotaciones.push({ tipo: 'agregado', start, end, texto: linea.texto })
    }

    cursor = finNormalizado
    cursorValido = true
  }

  flushEliminados()

  let aplicadas = 0
  for (const anotacion of anotaciones.sort((a, b) => b.start - a.start)) {
    if (anotacion.tipo === 'agregado') {
      const rango = rangoPorOffsets(contenedor, anotacion.start, anotacion.end)
      if (rango && envolverRango(rango, 'ins')) aplicadas += 1
    } else {
      const rango = rangoPorOffsets(contenedor, anotacion.start, anotacion.start)
      if (rango && insertarEliminado(rango, anotacion.texto)) aplicadas += 1
    }
  }
  return aplicadas
}

/** Quita las marcas de cambio dejando el documento limpio de nuevo. */
export function limpiarAnotaciones(contenedor: HTMLElement): void {
  contenedor
    .querySelectorAll(`ins[${ATRIBUTO_MARCA}]`)
    .forEach((elemento) => {
      const padre = elemento.parentNode
      if (!padre) return
      while (elemento.firstChild) {
        padre.insertBefore(elemento.firstChild, elemento)
      }
      padre.removeChild(elemento)
      if (padre instanceof Element) padre.normalize()
    })

  contenedor
    .querySelectorAll(`del[${ATRIBUTO_MARCA}]`)
    .forEach((elemento) => elemento.remove())
}
