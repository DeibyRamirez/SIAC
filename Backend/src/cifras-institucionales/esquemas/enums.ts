/**
 * Dominios cerrados tomados de docs/plantillas-siac-general.xlsx.
 * Género: el archivo solo trae Femenino y Masculino; el contrato también acepta
 * No binario y No informa, que ya formaban parte del dominio institucional.
 */
export const GENEROS_CIFRAS = ['Femenino', 'Masculino', 'No binario', 'No informa'] as const;

/** Grados observados en egresados y aseguramiento. */
export const GRADOS_CIFRAS = [
  'Profesional',
  'Licenciado',
  'Tecnólogo',
  'Especialista',
  'Magíster',
  'Doctor',
] as const;

export const NIVELES_CIFRAS = ['Pregrado', 'Posgrado'] as const;

/** La hoja infraestructura solo trae «En uso». Se acepta como valor permitido, no como texto libre. */
export const ESTADOS_INFRAESTRUCTURA = ['En uso'] as const;
