import { describe, expect, it } from 'vitest'

import { FORMULARIO_ANEXO_INICIAL, construirFormularioAnexo } from './formulario-anexo'

const completo = {
  ...FORMULARIO_ANEXO_INICIAL,
  titulo: 'Certificado de bomberos — Sede Norte',
  programaId: 'p1',
  evidenciaId: 'ev1',
  fechaVencimiento: '2026-09-01',
  responsable: 'admin.planeacion@uniautonoma.edu.co',
}
const archivo = new File(['%PDF-1.4'], 'certificado.pdf', { type: 'application/pdf' })

describe('construirFormularioAnexo', () => {
  it('exige evidencia vinculada y documento', () => {
    expect(construirFormularioAnexo({ ...completo, evidenciaId: '' }, archivo)).toEqual({
      error: 'Vincule el anexo a la evidencia que respalda.',
    })
    expect(construirFormularioAnexo(completo, null)).toEqual({ error: 'Adjunte el documento del anexo.' })
  })

  it('exige vencimiento del certificado o expedición + años', () => {
    const sinFechas = construirFormularioAnexo({ ...completo, fechaVencimiento: '' }, archivo)
    expect(sinFechas).toHaveProperty('error')
    const conExpedicion = construirFormularioAnexo(
      { ...completo, fechaVencimiento: '', fechaExpedicion: '2021-03-15', aniosVigencia: '5' },
      archivo,
    )
    expect('formData' in conExpedicion && conExpedicion.formData.get('aniosVigencia')).toBe('5')
  })

  it('envía categoría explícita, evidencia y fecha de vencimiento', () => {
    const resultado = construirFormularioAnexo(completo, archivo)
    if (!('formData' in resultado)) throw new Error(resultado.error)
    expect(resultado.formData.get('categoria')).toBe('Infraestructura')
    expect(resultado.formData.get('evidenciaId')).toBe('ev1')
    expect(resultado.formData.get('fechaVencimiento')).toBe('2026-09-01')
    expect(resultado.formData.get('aniosVigencia')).toBeNull()
  })
})
