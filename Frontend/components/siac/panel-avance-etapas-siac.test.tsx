import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PanelAvanceEtapasSIAC } from '@/components/siac/panel-avance-etapas-siac'
import type { ProgresoProcesoSIAC } from '@/lib/servicios/progreso-programa.servicio'
import type { Programa } from '@/lib/tipos'

const programa: Programa = {
  id: 'prog-derecho',
  nombre: 'Derecho',
  codigo: 'DER',
  nivel: 'Pregrado',
  facultad: 'Derecho',
  activo: true,
  semaforo: 'Verde',
  porcentajeAvance: 100,
  estadoProceso: 'En curso',
}

const progresoCompletado: ProgresoProcesoSIAC = {
  programaId: 'prog-derecho',
  tipoTramite: 'RenovacionRegistroCalificado',
  avanceGlobal: 100,
  documentosAceptados: 2,
  documentosTotal: 2,
  documentos: [
    {
      codigoGuia: 'G1',
      nombre: 'Documento maestro de programa',
      peso: 50,
      porcentajeInterno: 100,
      aportacion: 50,
      aceptado: true,
      rechazado: false,
      puntaje: 9,
      totalCondiciones: 9,
    },
    {
      codigoGuia: 'G2',
      nombre: 'Respaldo de mejoramiento de programa',
      peso: 50,
      porcentajeInterno: 100,
      aportacion: 50,
      aceptado: true,
      rechazado: false,
      puntaje: null,
      totalCondiciones: null,
    },
  ],
}

describe('PanelAvanceEtapasSIAC', () => {
  it('muestra barras al porcentaje interno y la aportación global por separado', () => {
    render(
      <PanelAvanceEtapasSIAC
        programas={[programa]}
        programaId="prog-derecho"
        onCambiarPrograma={() => {}}
        progreso={progresoCompletado}
      />,
    )

    expect(screen.getByText(/100% de avance global/)).toBeInTheDocument()
    expect(screen.getAllByText('Aporta 50% al avance global del programa')).toHaveLength(2)

    const valoresBarra = screen.getAllByText('100%')
    expect(valoresBarra.length).toBeGreaterThanOrEqual(2)
  })

  it('mientras carga el trámite muestra filas esqueleto y anuncia la espera', () => {
    const { container } = render(
      <PanelAvanceEtapasSIAC
        programas={[programa]}
        programaId="prog-derecho"
        onCambiarPrograma={() => {}}
        progreso={null}
        cargando
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Cargando el avance del trámite…')
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('[data-esqueleto="filas"]')).not.toBeNull()
    expect(screen.queryByText(/avance global/)).not.toBeInTheDocument()
  })
})
