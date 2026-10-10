import { describe, expect, it } from 'vitest'

import {
  ariaLabelSemaforo,
  colorPorPuntajeEvidencia,
  etiquetaVisibleSemaforo,
} from '@/lib/utilidades/etiquetas-semaforo'

describe('etiquetas-semaforo', () => {
  it('no expone nombres de color en etiquetas visibles', () => {
    expect(etiquetaVisibleSemaforo('Verde', 'avancePrograma')).toBe('Completado')
    expect(etiquetaVisibleSemaforo('Amarillo', 'vigenciaRegistro')).toBe('Próximo a vencer')
    expect(etiquetaVisibleSemaforo('Rojo', 'puntajeDocumento')).toBe('Requiere atención')
    expect(etiquetaVisibleSemaforo('Gris', 'puntajeDocumento')).toBe('Sin puntaje')
  })

  it('incluye el color solo en aria-label', () => {
    expect(ariaLabelSemaforo('Rojo', 'avancePrograma', 'General')).toContain('Atención requerida')
    expect(ariaLabelSemaforo('Rojo', 'avancePrograma', 'General')).toContain('rojo')
  })

  it('escala umbrales de puntaje como el backend', () => {
    expect(colorPorPuntajeEvidencia(9, 9)).toBe('Verde')
    expect(colorPorPuntajeEvidencia(5, 9)).toBe('Amarillo')
    expect(colorPorPuntajeEvidencia(4, 9)).toBe('Rojo')
    expect(colorPorPuntajeEvidencia(6, 6)).toBe('Verde')
    expect(colorPorPuntajeEvidencia(4, 6)).toBe('Amarillo')
  })
})
