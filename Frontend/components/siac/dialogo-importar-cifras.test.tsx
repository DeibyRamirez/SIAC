import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { importarCifrasExcelApi, descargarPlantillaCifrasApi, descargarPlantillaJsonCifrasApi } =
  vi.hoisted(() => ({
    importarCifrasExcelApi: vi.fn(),
    descargarPlantillaCifrasApi: vi.fn(),
    descargarPlantillaJsonCifrasApi: vi.fn(),
  }))

vi.mock('@/lib/servicios/cifras.servicio', () => ({
  importarCifrasExcelApi,
  descargarPlantillaCifrasApi,
  descargarPlantillaJsonCifrasApi,
}))

import { DialogoImportarCifras } from '@/components/siac/dialogo-importar-cifras'

function renderDialogo(onImportado = vi.fn()) {
  render(
    <DialogoImportarCifras
      categoriaId="profesores"
      categoriaTitulo="Profesores"
      abierto
      onAbiertoCambiar={() => {}}
      onImportado={onImportado}
    />,
  )
  return { onImportado }
}

describe('DialogoImportarCifras (S3-02)', () => {
  beforeEach(() => {
    importarCifrasExcelApi.mockReset()
    descargarPlantillaCifrasApi.mockReset()
    descargarPlantillaJsonCifrasApi.mockReset()
  })

  it('rechaza en cliente un archivo que no es .xlsx', async () => {
    renderDialogo()
    const entrada = screen.getByLabelText('Archivo Excel (.xlsx)')

    fireEvent.change(entrada, {
      target: { files: [new File(['x'], 'cifras.pdf', { type: 'application/pdf' })] },
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('Solo se permiten archivos .xlsx.')
    expect(screen.getByRole('button', { name: 'Importar' })).toBeDisabled()
    expect(importarCifrasExcelApi).not.toHaveBeenCalled()
  })

  it('rechaza en cliente un archivo de más de 20 MB', async () => {
    renderDialogo()
    const entrada = screen.getByLabelText('Archivo Excel (.xlsx)')
    const grande = new File(['x'], 'cifras.xlsx')
    Object.defineProperty(grande, 'size', { value: 21 * 1024 * 1024 })

    fireEvent.change(entrada, { target: { files: [grande] } })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El archivo supera el tamaño máximo de 20 MB.',
    )
  })

  it('descarga el ejemplo JSON de la categoría', async () => {
    const clicAncla = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    renderDialogo()
    descargarPlantillaJsonCifrasApi.mockResolvedValue({
      categoriaId: 'profesores',
      registros: [{ programa: 'X', periodo_academico: '2023-2' }],
    })

    fireEvent.click(screen.getByRole('button', { name: /Descargar ejemplo JSON/i }))

    expect(descargarPlantillaJsonCifrasApi).toHaveBeenCalledWith('profesores')
    expect(await screen.findByRole('button', { name: /Descargar ejemplo JSON/i })).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    clicAncla.mockRestore()
  })

  it('importa el .xlsx y muestra el resumen con errores por fila y columna', async () => {
    const { onImportado } = renderDialogo()
    importarCifrasExcelApi.mockResolvedValue({
      filasOk: 1,
      filasError: 1,
      errores: [
        {
          fila: 3,
          columna: 'estrato',
          mensaje: 'Fila 3, columna estrato: debe ser un entero entre 1 y 6',
        },
      ],
      fuente: 'EXCEL',
      periodosReemplazados: ['2023-2'],
    })

    const entrada = screen.getByLabelText('Archivo Excel (.xlsx)')
    fireEvent.change(entrada, {
      target: { files: [new File(['x'], 'cifras.xlsx')] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Importar' }))

    expect(
      await screen.findByText('Importación finalizada: 1 fila(s) importada(s), 1 con error.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Fila 3, columna estrato: debe ser un entero entre 1 y 6'),
    ).toBeInTheDocument()
    expect(screen.getByText('Reemplazados: 2023-2')).toBeInTheDocument()
    expect(importarCifrasExcelApi).toHaveBeenCalledWith('profesores', expect.any(File))
    expect(onImportado).toHaveBeenCalledTimes(1)
  })

  it('muestra el mensaje del backend si la importación falla', async () => {
    renderDialogo()
    importarCifrasExcelApi.mockRejectedValue(new Error('El archivo supera el tamaño máximo de 20 MB.'))

    const entrada = screen.getByLabelText('Archivo Excel (.xlsx)')
    fireEvent.change(entrada, {
      target: { files: [new File(['x'], 'cifras.xlsx')] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Importar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El archivo supera el tamaño máximo de 20 MB.',
    )
  })
})
