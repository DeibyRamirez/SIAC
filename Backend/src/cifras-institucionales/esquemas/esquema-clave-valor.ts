import { EsquemaCategoriaCifras } from './tipos';

/**
 * Bienestar y relaciones-entorno no tienen hoja en plantillas-siac-general.xlsx.
 * Usan el formato clave/valor de la guía: clave, periodo, facultad, dimension,
 * valor_dimension (texto) y valor (número).
 */
export function esquemaClaveValor(categoriaId: string, titulo: string): EsquemaCategoriaCifras {
  return {
    categoriaId,
    hoja: null,
    titulo,
    claveReemplazo: 'periodo',
    columnas: [
      {
        encabezado: 'Clave',
        clave: 'clave',
        tipo: 'texto',
        obligatoria: true,
        maxCaracteres: 120,
        campoPrisma: 'clave',
      },
      {
        encabezado: 'Período',
        clave: 'periodo',
        tipo: 'periodo',
        obligatoria: true,
        campoPrisma: 'periodo',
      },
      {
        encabezado: 'Facultad',
        clave: 'facultad',
        tipo: 'texto',
        obligatoria: false,
        maxCaracteres: 300,
        campoPrisma: 'facultad',
      },
      {
        encabezado: 'Dimensión',
        clave: 'dimension',
        tipo: 'texto',
        obligatoria: false,
        maxCaracteres: 120,
        campoPrisma: 'dimension',
      },
      {
        encabezado: 'Valor de la dimensión',
        clave: 'valor_dimension',
        tipo: 'texto',
        obligatoria: false,
        maxCaracteres: 200,
        campoPrisma: 'valorDimension',
      },
      {
        encabezado: 'Valor',
        clave: 'valor',
        tipo: 'decimal',
        obligatoria: true,
        campoPrisma: 'valor',
      },
    ],
  };
}

export const ESQUEMA_BIENESTAR = esquemaClaveValor('bienestar', 'Bienestar');
export const ESQUEMA_RELACIONES_ENTORNO = esquemaClaveValor(
  'relaciones-entorno',
  'Relaciones con el entorno',
);
