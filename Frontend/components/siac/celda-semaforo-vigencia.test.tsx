import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CeldaSemaforoVigencia } from '@/components/siac/celda-semaforo-vigencia'
import {
  calcularPorcentajeVigencia,
  calcularSemaforoVigencia,
} from '@/lib/utilidades/vigencia-registro'

describe('CeldaSemaforoVigencia', () => {
  it('refleja estado y porcentaje coherentes con la fecha de resolución', () => {
    const fechaResolucion = '2019-06-01'
    const referencia = new Date('2025-06-01T12:00:00')
    const semaforo = calcularSemaforoVigencia(fechaResolucion, referencia)
    const porcentaje = calcularPorcentajeVigencia(fechaResolucion, referencia)
    const estado = semaforo === 'Verde' ? 'Vigente' : semaforo === 'Amarillo' ? 'Proximo' : 'Vencido'

    render(<CeldaSemaforoVigencia estado={estado} porcentaje={porcentaje} />)

    expect(screen.getByText(`${porcentaje}% del periodo`)).toBeInTheDocument()
    if (estado === 'Proximo') {
      expect(screen.getByText('Próximo a vencer')).toBeInTheDocument()
    }
  })
})
