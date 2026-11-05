import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RejillaProgramas } from '@/components/siac/rejilla-programas'
import type { FilaPanelPrograma } from '@/lib/servicios/panel-programas.servicio'

vi.mock('next/image', () => ({
  default: (props: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} />
  ),
}))

function fila(parcial: Partial<FilaPanelPrograma> = {}): FilaPanelPrograma {
  return {
    id: 'p1',
    nombre: 'Administración de Empresas',
    tituloCatalogo: 'Administración de Empresas',
    codigoSnies: '19828',
    nivel: 'Pregrado',
    modalidad: 'Presencial',
    facultad: 'Facultad de Ciencias Administrativas',
    duracion: '9 semestres',
    creditos: 175,
    resolucionCatalogo: '9941',
    fechaResolucionCatalogo: '2020-06-17',
    alcance: 'Programa',
    tipoTramite: 'RenovacionRegistroCalificado',
    avancePorcentual: 55,
    semaforoAvance: 'Amarillo',
    semaforoVigencia: 'SinVigencia',
    semaforoGeneral: 'Amarillo',
    documentos: [
      {
        codigoGuia: 'G1',
        nombre: 'DM',
        puntaje: 8,
        totalCondiciones: 9,
        porcentajeInterno: 88.89,
        peso: 90,
        aportacion: 80,
        revisado: true,
      },
    ],
    anexoInfraestructuraVencido: false,
    fechaResolucion: null,
    fechaFinVigencia: null,
    semestre: '2026-2',
    activo: true,
    urlImagen: 'https://sitio-cuac.vercel.app/Carreras/administracion.png',
    ...parcial,
  }
}

describe('RejillaProgramas', () => {
  it('muestra jerarquía, cuadrícula del catálogo y semáforos con texto', () => {
    render(
      <RejillaProgramas
        programas={[
          {
            ...fila(),
            porcentajeAvance: 55,
            semaforo: 'Amarillo',
            estadoProceso: 'En progreso',
          },
        ]}
        enlaceDetalle={() => '/administrador/programas/p1'}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Administración de Empresas' })).toBeInTheDocument()
    expect(screen.getByText('SNIES 19828')).toBeInTheDocument()
    expect(screen.getByText('9 semestres')).toBeInTheDocument()
    expect(screen.getByText('175')).toBeInTheDocument()
    expect(screen.getByText('9941')).toBeInTheDocument()
    expect(screen.getByText('G1 8/9')).toBeInTheDocument()
    expect(screen.getByText('Resolución MEN (SIAC)')).toBeInTheDocument()
    expect(screen.getByText('General:')).toBeInTheDocument()
  })

  it('muestra estado vacío', () => {
    render(<RejillaProgramas programas={[]} />)
    expect(screen.getByRole('status')).toHaveTextContent(/No hay programas/)
  })

  it('muestra esqueletos en carga', () => {
    render(<RejillaProgramas programas={[]} cargando />)
    expect(screen.getByLabelText('Cargando programas')).toBeInTheDocument()
  })
})
