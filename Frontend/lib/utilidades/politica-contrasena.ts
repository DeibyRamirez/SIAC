/** Política de contraseña alineada con Backend/src/auth/politica-contrasena.ts */

export const REGEX_POLITICA_CONTRASENA =
  /^(?=.*[A-Za-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export const MENSAJE_POLITICA_CONTRASENA =
  'Use una contraseña segura: mínimo 8 caracteres, con letras, al menos una mayúscula, un número y un símbolo.'

export interface CriteriosContrasena {
  longitud: boolean
  letra: boolean
  mayuscula: boolean
  numero: boolean
  simbolo: boolean
}

export function cumplePoliticaContrasena(valor: string): boolean {
  return REGEX_POLITICA_CONTRASENA.test(valor)
}

export function criteriosContrasena(valor: string): CriteriosContrasena {
  return {
    longitud: valor.length >= 8,
    letra: /[A-Za-z]/.test(valor),
    mayuscula: /[A-Z]/.test(valor),
    numero: /\d/.test(valor),
    simbolo: /[^A-Za-z0-9]/.test(valor),
  }
}
