import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { TextareaConContador } from '@/components/siac/textarea-con-contador'

function Envoltura({ inicial = '' }: { inicial?: string }) {
  const [valor, setValor] = useState(inicial)
  return <TextareaConContador aria-label="Observación" value={valor} onChange={(e) => setValor(e.target.value)} />
}

describe('TextareaConContador', () => {
  it('muestra el contador n/600 y limita con maxLength', () => {
    render(<Envoltura />)
    const campo = screen.getByLabelText('Observación')
    expect(campo).toHaveAttribute('maxLength', '600')
    expect(screen.getByText('0/600')).toBeInTheDocument()
    fireEvent.change(campo, { target: { value: 'hola' } })
    expect(screen.getByText('4/600')).toBeInTheDocument()
  })

  it('resalta el contador cerca del límite', () => {
    render(<Envoltura inicial={'x'.repeat(590)} />)
    expect(screen.getByText('590/600')).toHaveClass('text-destructive')
  })
})
