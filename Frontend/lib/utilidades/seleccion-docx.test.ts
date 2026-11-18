import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DURACION_RESALTADO_COMENTARIO_MS,
  resaltarCita,
} from '@/lib/utilidades/seleccion-docx'

function montarContenedor(): HTMLElement {
  const contenedor = document.createElement('div')
  contenedor.innerHTML = `
    <p>Primer párrafo con texto estable.</p>
    <p>Segundo párrafo: la cita
      continúa aquí con espacios
      y saltos de línea.</p>
    <p>Tercer párrafo distinto.</p>
  `
  document.body.appendChild(contenedor)
  return contenedor
}

describe('resaltarCita', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      writable: true,
      configurable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('encuentra una cita normalizada aunque el DOM tenga saltos de línea', () => {
    const contenedor = montarContenedor()

    const resultado = resaltarCita(contenedor, {
      quote: 'la cita continúa aquí con espacios y saltos de línea',
    })

    expect(resultado.encontrado).toBe(true)
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    expect(contenedor.querySelectorAll('mark[data-siac-cita]').length).toBeGreaterThan(0)
    expect(contenedor.textContent).toContain('la cita')
  })

  it('ignora un ancla desalineada y resuelve por la cita', () => {
    const contenedor = montarContenedor()

    const resultado = resaltarCita(contenedor, {
      anchor: '0:12',
      quote: 'Tercer párrafo distinto',
    })

    expect(resultado.encontrado).toBe(true)
    const marca = contenedor.querySelector('mark[data-siac-cita]')
    expect(marca?.textContent).toBe('Tercer párrafo distinto')
  })

  it('inserta un separador lógico entre párrafos aunque el DOM no tenga texto entre ellos', () => {
    const contenedor = document.createElement('div')
    const primero = document.createElement('p')
    primero.textContent = 'fin del párrafo'
    const segundo = document.createElement('p')
    segundo.textContent = 'inicio del siguiente'
    contenedor.append(primero, segundo)
    document.body.appendChild(contenedor)

    const resultado = resaltarCita(contenedor, {
      quote: 'párrafo inicio del siguiente',
    })

    expect(resultado.encontrado).toBe(true)
    expect(contenedor.querySelectorAll('mark[data-siac-cita]')).toHaveLength(2)
  })

  it('marca citas que cruzan varios párrafos sin romper el formato', () => {
    const contenedor = montarContenedor()

    const resultado = resaltarCita(contenedor, {
      quote: 'estable. Segundo párrafo',
    })

    expect(resultado.encontrado).toBe(true)
    const marcas = contenedor.querySelectorAll('mark[data-siac-cita]')
    expect(marcas).toHaveLength(2)
    expect(contenedor.querySelectorAll('p')).toHaveLength(3)
  })

  it('retira la marca a los 10 s y al llamar limpiar antes de tiempo', () => {
    const contenedor = montarContenedor()
    const resultado = resaltarCita(contenedor, { quote: 'Primer párrafo' })

    expect(contenedor.querySelector('mark[data-siac-cita]')).not.toBeNull()
    vi.advanceTimersByTime(DURACION_RESALTADO_COMENTARIO_MS - 1)
    expect(contenedor.querySelector('mark[data-siac-cita]')).not.toBeNull()
    vi.advanceTimersByTime(1)
    expect(contenedor.querySelector('mark[data-siac-cita]')).toBeNull()

    const segundo = resaltarCita(contenedor, { quote: 'Tercer párrafo' })
    expect(contenedor.querySelector('mark[data-siac-cita]')).not.toBeNull()
    segundo.limpiar()
    expect(contenedor.querySelector('mark[data-siac-cita]')).toBeNull()
  })

  it('devuelve no encontrado cuando la cita no existe en la versión', () => {
    const contenedor = montarContenedor()

    const resultado = resaltarCita(contenedor, { quote: 'fragmento inexistente' })

    expect(resultado.encontrado).toBe(false)
    expect(contenedor.querySelector('mark[data-siac-cita]')).toBeNull()
  })
})
