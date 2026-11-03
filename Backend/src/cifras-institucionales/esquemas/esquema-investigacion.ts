import { GENEROS_CIFRAS } from './enums';
import { EsquemaCategoriaCifras } from './tipos';

export const ESQUEMA_INVESTIGACION: EsquemaCategoriaCifras = {
  categoriaId: 'investigacion',
  hoja: 'investigacion',
  titulo: 'Investigación',
  claveReemplazo: 'periodo_academico',
  columnas: [
    {
      encabezado: 'Facultad',
      clave: 'facultad',
      tipo: 'texto',
      obligatoria: true,
      maxCaracteres: 300,
      campoPrisma: 'facultad',
    },
    {
      encabezado: 'Grupo de investigación',
      clave: 'grupo_investigacion',
      tipo: 'texto',
      obligatoria: true,
      maxCaracteres: 300,
      alias: ['grupo de investigacion'],
      campoPrisma: 'grupoInvestigacion',
    },
    {
      encabezado: 'Semillero',
      clave: 'semillero',
      tipo: 'texto',
      obligatoria: true,
      maxCaracteres: 300,
      campoPrisma: 'semillero',
    },
    {
      encabezado: 'Período académico',
      clave: 'periodo_academico',
      tipo: 'periodo',
      obligatoria: true,
      alias: ['periodo academico'],
      campoPrisma: 'periodoAcademico',
    },
    {
      encabezado: 'Cantidad de estudiantes',
      clave: 'cantidad_estudiantes',
      tipo: 'entero',
      obligatoria: true,
      min: 0,
      alias: ['cantidad estudiantes', 'cantidad estudianes'],
      campoPrisma: 'cantidadEstudiantes',
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
      encabezado: 'Programa',
      clave: 'programa',
      tipo: 'texto',
      obligatoria: true,
      maxCaracteres: 300,
      campoPrisma: 'programa',
    },
  ],
};
