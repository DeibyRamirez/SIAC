import { describe, expect, it } from 'vitest'

import {
  cumplePoliticaContrasena,
  criteriosContrasena,
} from '@/lib/utilidades/politica-contrasena'

describe('politica-contrasena', () => {
  it('acepta una contraseña que cumple todos los criterios', () => {
    expect(cumplePoliticaContrasena('Secreto1!')).toBe(true)
  })

  it('rechaza contraseña corta', () => {
    expect(cumplePoliticaContrasena('Ab1!')).toBe(false)
    expect(criteriosContrasena('Ab1!').longitud).toBe(false)
  })

  it('rechaza sin mayúscula', () => {
    expect(cumplePoliticaContrasena('secreto1!')).toBe(false)
    expect(criteriosContrasena('secreto1!').mayuscula).toBe(false)
  })

  it('rechaza sin número', () => {
    expect(cumplePoliticaContrasena('Secreto!')).toBe(false)
    expect(criteriosContrasena('Secreto!').numero).toBe(false)
  })

  it('rechaza sin símbolo', () => {
    expect(cumplePoliticaContrasena('Secreto1')).toBe(false)
    expect(criteriosContrasena('Secreto1').simbolo).toBe(false)
  })

  it('rechaza sin letras', () => {
    expect(cumplePoliticaContrasena('12345678!')).toBe(false)
    expect(criteriosContrasena('12345678!').letra).toBe(false)
  })
})
