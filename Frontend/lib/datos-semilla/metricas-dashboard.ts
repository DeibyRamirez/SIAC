export const tendenciaMensualSemilla = [
  { mes: 'Mar', evidencias: 28 },
  { mes: 'Abr', evidencias: 42 },
  { mes: 'May', evidencias: 55 },
  { mes: 'Jun', evidencias: 68 },
  { mes: 'Jul', evidencias: 82 },
  { mes: 'Ago', evidencias: 95 },
]

export const distribucionEstadosSemilla = [
  { estado: 'Validadas', valor: 184, clave: 'validadas' },
  { estado: 'En revisión', valor: 28, clave: 'revision' },
  { estado: 'Borrador', valor: 14, clave: 'borrador' },
]

const IMAGEN_RESUMEN = '/imagenes/siac/placeholder-resumen.svg'

export const tarjetasResumenSemilla = [
  {
    id: 'vision-institucional',
    titulo: 'Visión institucional',
    valor: '81.4%',
    detalle: 'Cumplimiento global del SIAC',
    urlImagen: IMAGEN_RESUMEN,
  },
  {
    id: 'condiciones-institucionales',
    titulo: 'Condiciones institucionales',
    valor: '88.2%',
    detalle: '6 condiciones · pre-calificación',
    urlImagen: IMAGEN_RESUMEN,
  },
  {
    id: 'condiciones-programa',
    titulo: 'Condiciones de programa',
    valor: '76.9%',
    detalle: 'Avance por programas académicos',
    urlImagen: IMAGEN_RESUMEN,
  },
]

export const resumenInstitucionalSemilla = {
  avanceGeneral: 78,
  evidenciasValidadas: 184,
  evidenciasEnProceso: 42,
  programasActivos: 12,
  pregrado: 8,
  posgrado: 4,
  documentosPorVencer: 17,
  tareasPendientes: 6,
  cumplimientoInstitucional: 81.4,
  condicionesInstitucionales: 88.2,
  condicionesPrograma: 76.9,
}
