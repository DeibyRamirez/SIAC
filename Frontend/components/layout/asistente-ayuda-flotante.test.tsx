import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AsistenteAyudaFlotante } from '@/components/layout/asistente-ayuda-flotante'

describe('AsistenteAyudaFlotante', () => {
  it('abre el panel al pulsar el botón flotante', () => {
    render(<AsistenteAyudaFlotante />)
    fireEvent.click(screen.getByRole('button', { name: /abrir asistente de ayuda/i }))
    expect(screen.getByRole('heading', { name: /asistente siac/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/buscar en ayuda/i)).toBeInTheDocument()
  })

  it('filtra preguntas al escribir en la búsqueda', () => {
    render(<AsistenteAyudaFlotante />)
    fireEvent.click(screen.getByRole('button', { name: /abrir asistente de ayuda/i }))
    const input = screen.getByPlaceholderText(/buscar en ayuda/i)
    fireEvent.change(input, { target: { value: 'plantillas' } })
    expect(screen.getByText(/mostrando 1 pregunta/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /plantillas oficiales/i })).toBeInTheDocument()
  })

  it('expande una pregunta y muestra la respuesta', () => {
    render(<AsistenteAyudaFlotante />)
    fireEvent.click(screen.getByRole('button', { name: /abrir asistente de ayuda/i }))
    const trigger = screen.getByRole('button', { name: /¿qué es siac\?/i })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const region = screen.getByRole('region', { name: /¿qué es siac\?/i })
    expect(
      within(region).getByText(/sistema interno de aseguramiento de la calidad/i),
    ).toBeInTheDocument()
  })
})
