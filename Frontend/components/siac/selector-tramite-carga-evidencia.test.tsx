import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SelectorTramiteCargaEvidencia } from '@/components/siac/selector-tramite-carga-evidencia'

describe('SelectorTramiteCargaEvidencia · guías disponibles', () => {
  it('solo permite elegir guías incluidas en guiasDisponibles', () => {
    const onCodigoGuiaChange = vi.fn()

    render(
      <SelectorTramiteCargaEvidencia
        modalidad="Renovacion"
        alcance="Programa"
        codigoGuia={null}
        bloquearPasosTramite
        inicioNumeracion={2}
        guiasDisponibles={['G2']}
        bloqueosCarga={[
          {
            codigoGuia: 'G1',
            motivo: 'Debe aprobarse G1 antes de cargar G2.',
          },
        ]}
        onModalidadChange={vi.fn()}
        onAlcanceChange={vi.fn()}
        onCodigoGuiaChange={onCodigoGuiaChange}
      />,
    )

    const botonG1 = screen.getByRole('button', { name: /G1 —/i })
    const botonG2 = screen.getByRole('button', { name: /G2 —/i })

    expect(botonG1).toBeDisabled()
    fireEvent.click(botonG1)
    expect(onCodigoGuiaChange).not.toHaveBeenCalled()

    fireEvent.click(botonG2)
    expect(onCodigoGuiaChange).toHaveBeenCalledWith('G2')
  })
})
