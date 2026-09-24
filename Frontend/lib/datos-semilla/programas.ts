import type { Programa } from '@/lib/tipos'

const IMAGEN_PROGRAMA = '/imagenes/siac/placeholder-programa.svg'

export const programasSemilla: Programa[] = [
  {
    id: 'prog-der',
    nombre: 'Derecho',
    codigo: 'DER-01',
    nivel: 'Pregrado',
    semaforo: 'Verde',
    porcentajeAvance: 85,
    estadoProceso: 'En autoevaluación',
    urlImagen: "/Carreras/derecho.png",
  },
  {
    id: 'prog-isw',
    nombre: 'Ingeniería de Software y Computación',
    codigo: 'ISW-02',
    nivel: 'Pregrado',
    semaforo: 'Amarillo',
    porcentajeAvance: 89,
    estadoProceso: 'En autoevaluación',
    urlImagen: "/Carreras/ingenieria_software.png",
  },
  {
    id: 'prog-ade',
    nombre: 'Administración de Empresas',
    codigo: 'ADE-03',
    nivel: 'Pregrado',
    semaforo: 'Verde',
    porcentajeAvance: 92,
    estadoProceso: 'Documentación completa',
    urlImagen: "/Carreras/administracion.png",
  },
  {
    id: 'prog-end',
    nombre: 'Entrenamiento deportivo',
    codigo: 'MED-05',
    nivel: 'Posgrado',
    semaforo: 'Amarillo',
    porcentajeAvance: 68,
    estadoProceso: 'En revisión interna',
    urlImagen: "/Carreras/entrenamiento_deportivo.png",
  },
  {
    id: 'prog-ina',
    nombre: 'Ingenieria Ambiental',
    codigo: 'ENF-04',
    nivel: 'Pregrado',
    semaforo: 'Verde',
    porcentajeAvance: 88,
    estadoProceso: 'En autoevaluación',
    urlImagen: "/Carreras/ambiental.png",
  },
  {
    id: 'prog-ine',
    nombre: 'Ingenieria Energetica',
    codigo: 'PSI-06',
    nivel: 'Pregrado',
    semaforo: 'Amarillo',
    porcentajeAvance: 71,
    estadoProceso: 'En autoevaluación',
    urlImagen: "/Carreras/energetica.png",
  },
  {
    id: 'prog-con',
    nombre: 'Contaduría Pública',
    codigo: 'CON-07',
    nivel: 'Pregrado',
    semaforo: 'Verde',
    porcentajeAvance: 90,
    estadoProceso: 'Documentación completa',
    urlImagen: "/Carreras/contaduria.png",
  },
  {
    id: 'prog-fni',
    nombre: 'Finanzas y Negocios Internacionales',
    codigo: 'COM-08',
    nivel: 'Pregrado',
    semaforo: 'Rojo',
    porcentajeAvance: 31,
    estadoProceso: 'Requiere atención',
    urlImagen: "/Carreras/finanzas.png",
  },
  {
    id: 'prog-lei',
    nombre: 'Licenciatura en Educación Infantil',
    codigo: 'MBA-09',
    nivel: 'Posgrado',
    semaforo: 'Amarillo',
    porcentajeAvance: 65,
    estadoProceso: 'En autoevaluación',
    urlImagen: "/Carreras/licenciatura.png",
  },
  {
    id: 'prog-inc',
    nombre: 'Ingenieria Civil',
    codigo: 'INV-10',
    nivel: 'Pregrado',
    semaforo: 'Rojo',
    porcentajeAvance: 28,
    estadoProceso: 'Registro nuevo',
    urlImagen: "/Carreras/civil.png",
  },
  {
    id: 'prog-inv',
    nombre: 'Innovación Educativa',
    codigo: 'INV-10',
    nivel: 'Posgrado',
    semaforo: 'Rojo',
    porcentajeAvance: 28,
    estadoProceso: 'Registro nuevo',
    urlImagen: IMAGEN_PROGRAMA,
  },
  {
    id: 'prog-cib',
    nombre: 'Ciberseguridad',
    codigo: 'CIB-11',
    nivel: 'Posgrado',
    semaforo: 'Amarillo',
    porcentajeAvance: 55,
    estadoProceso: 'Registro nuevo',
    urlImagen: IMAGEN_PROGRAMA,
  },
  {
    id: 'prog-arc',
    nombre: 'Arquitectura',
    codigo: 'ARC-12',
    nivel: 'Pregrado',
    semaforo: 'Verde',
    porcentajeAvance: 82,
    estadoProceso: 'En autoevaluación',
    urlImagen: IMAGEN_PROGRAMA,
  },
]

export const catalogoFactoresIndicadores = [
  {
    factor: 'Factor 1 · Proyecto educativo',
    indicadores: [
      'Indicador 1.1 · Diseño curricular y plan de estudios',
      'Indicador 1.2 · Modelo pedagógico',
    ],
  },
  {
    factor: 'Factor 2 · Profesores',
    indicadores: [
      'Indicador 2.1 · Perfil y vinculación docente',
      'Indicador 2.2 · Formación y evaluación docente',
    ],
  },
  {
    factor: 'Factor 3 · Investigación e innovación',
    indicadores: ['Indicador 3.1 · Líneas y productos de investigación'],
  },
  {
    factor: 'Factor 4 · Procesos académicos',
    indicadores: ['Indicador 4.1 · Seguimiento académico'],
  },
  {
    factor: 'Factor 7 · Egresados',
    indicadores: ['Indicador 7.1 · Seguimiento a egresados'],
  },
]

export const factoresSemilla = catalogoFactoresIndicadores.map((f) => f.factor)

export const periodosSemilla = ['2024-1', '2024-2', '2025-1', '2025-2', '2026-1', '2026-2']
