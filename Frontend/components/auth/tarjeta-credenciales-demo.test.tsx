import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TarjetaCredencialesDemo } from '@/components/auth/tarjeta-credenciales-demo'

describe('tarjeta de credenciales demo', () => {
  it('muestra el rol como Profesor y conserva el correo semilla', () => {
    render(<TarjetaCredencialesDemo />)
    expect(screen.getByText('Profesor')).toBeInTheDocument()
    expect(screen.queryByText('Cargador')).toBeNull()
    expect(screen.getByText('maria.cargadora@uniautonoma.edu.co')).toBeInTheDocument()
  })
})
