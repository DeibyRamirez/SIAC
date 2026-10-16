/** Política de contraseña alineada con Frontend/lib/utilidades/politica-contrasena.ts */

export const REGEX_POLITICA_CONTRASENA =
  /^(?=.*[A-Za-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export const MENSAJE_POLITICA_CONTRASENA =
  'Use una contraseña segura: mínimo 8 caracteres, con letras, al menos una mayúscula, un número y un símbolo.'
