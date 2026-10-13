import { describe, expect, it } from 'vitest'

import {
  coincidirOpcionFiltro,
  construirUrlCifras,
  filtrosCifrasParaApi,
  leerFiltrosCifrasUrl,
  OPCION_TODOS_CIFRAS,
} from './parametros-cifras-url'

describe('parametros-cifras-url (S3-02)', () => {
  it('lee la URL con valores por defecto y la reconstruye igual (enlace estable)', () => {
    const filtros = leerFiltrosCifrasUrl({ periodo: ' 2025-2 ', facultad: 'Ingeniería' })
    expect(filtros).toEqual({
      periodo: '2025-2',
      facultad: 'Ingeniería',
      programa: OPCION_TODOS_CIFRAS,
      sede: OPCION_TODOS_CIFRAS,
    })
    expect(construirUrlCifras(filtros, '/administrador/dashboard')).toBe(
      '/administrador/dashboard?periodo=2025-2&facultad=Ingenier%C3%ADa',
    )
    expect(construirUrlCifras(leerFiltrosCifrasUrl({}), '/administrador/dashboard')).toBe(
      '/administrador/dashboard',
    )
  })

  it('ignora valores vacíos y traduce los filtros a la API', () => {
    const filtros = leerFiltrosCifrasUrl(
      new URLSearchParams('periodo=&programa=Ingeniería Agropecuaria&sede=Claustro El Carmen'),
    )
    expect(filtrosCifrasParaApi(filtros)).toEqual({
      periodo: undefined,
      facultad: undefined,
      programa: 'Ingeniería Agropecuaria',
      sede: 'Claustro El Carmen',
    })
  })

  it('traduce «todos» como sin filtro', () => {
    expect(
      filtrosCifrasParaApi(
        leerFiltrosCifrasUrl({
          facultad: OPCION_TODOS_CIFRAS,
          programa: OPCION_TODOS_CIFRAS,
          sede: OPCION_TODOS_CIFRAS,
        }),
      ),
    ).toEqual({ periodo: undefined, facultad: undefined, programa: undefined, sede: undefined })
  })

  it('coincide con las opciones ignorando mayúsculas y tildes', () => {
    const opciones = ['Facultad de Ciencias Agrarias', 'Ingeniería Agropecuaria']
    expect(coincidirOpcionFiltro(opciones, 'facultad de ciencias agrarias')).toBe(
      'Facultad de Ciencias Agrarias',
    )
    expect(coincidirOpcionFiltro(opciones, 'ingenieria agropecuaria')).toBe(
      'Ingeniería Agropecuaria',
    )
    expect(coincidirOpcionFiltro(opciones, 'Facultad Inexistente')).toBeUndefined()
    expect(coincidirOpcionFiltro(opciones, OPCION_TODOS_CIFRAS)).toBeUndefined()
  })
})
