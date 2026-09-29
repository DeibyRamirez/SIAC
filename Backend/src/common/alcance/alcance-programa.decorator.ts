import { SetMetadata } from '@nestjs/common';

export const ALCANCE_PROGRAMA_KEY = 'alcancePrograma';

export interface OpcionesAlcancePrograma {
  /** Parámetro de ruta con el id del programa. */
  parametroPrograma?: string;
  /** Parámetro de ruta con el id de la evidencia; el programa se resuelve en la base. */
  parametroEvidencia?: string;
  /** Campo del cuerpo JSON con el id del programa. */
  campoCuerpo?: string;
  /** Campo de la query con el id del programa. */
  campoConsulta?: string;
  /**
   * lectura: SuperAdmin y Administrador pasan sin asignación.
   * escritura: solo SuperAdmin pasa sin asignación.
   * Si se omite, GET y HEAD son lectura.
   */
  modo?: 'lectura' | 'escritura';
}

export const AlcancePrograma = (opciones: OpcionesAlcancePrograma = {}) =>
  SetMetadata(ALCANCE_PROGRAMA_KEY, opciones);
