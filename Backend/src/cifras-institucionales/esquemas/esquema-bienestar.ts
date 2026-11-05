import { GENEROS_CIFRAS } from './enums';
import { EsquemaCategoriaCifras } from './tipos';

/** Bienestar no tiene hoja en plantillas-siac-general.xlsx. */
export const ESQUEMA_BIENESTAR: EsquemaCategoriaCifras = {
  categoriaId: 'bienestar',
  hoja: null,
  titulo: 'Bienestar',
  claveReemplazo: 'periodo_academico',
  columnas: [
    {
      encabezado: 'Período académico',
      clave: 'periodo_academico',
      tipo: 'periodo',
      obligatoria: true,
      alias: ['periodo academico'],
      campoPrisma: 'periodoAcademico',
    },
    {
      encabezado: 'Facultad',
      clave: 'facultad',
      tipo: 'texto',
      obligatoria: true,
      maxCaracteres: 300,
      alias: ['falcultad', 'facultad'],
      campoPrisma: 'facultad',
    },
    {
      encabezado: 'Programa',
      clave: 'programa',
      tipo: 'texto',
      obligatoria: true,
      maxCaracteres: 300,
      campoPrisma: 'programa',
    },
    {
      encabezado: 'Género',
      clave: 'genero',
      tipo: 'enum',
      obligatoria: true,
      enum: GENEROS_CIFRAS,
      campoPrisma: 'genero',
    },
    {
      encabezado: 'Línea de bienestar',
      clave: 'linea_bienestar',
      tipo: 'texto',
      obligatoria: true,
      maxCaracteres: 300,
      alias: ['linea de bienestar'],
      campoPrisma: 'lineaBienestar',
    },
    {
      encabezado: 'Servicio',
      clave: 'servicio',
      tipo: 'texto',
      obligatoria: true,
      maxCaracteres: 300,
      campoPrisma: 'servicio',
    },
    {
      encabezado: 'Beneficiarios',
      clave: 'beneficiarios',
      tipo: 'entero',
      obligatoria: true,
      min: 0,
      campoPrisma: 'beneficiarios',
    },
    {
      encabezado: 'Valor invertido COP',
      clave: 'valor_invertido_cop',
      tipo: 'decimal',
      obligatoria: true,
      min: 0,
      alias: ['valor invertido cop'],
      campoPrisma: 'valorInvertidoCop',
    },
  ],
};
