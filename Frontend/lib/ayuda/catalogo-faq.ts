export type CategoriaFaq =
  | 'general'
  | 'tramites'
  | 'vigencias'
  | 'documentos'
  | 'normativa'

export interface EntradaFaq {
  id: string
  categoria: CategoriaFaq
  pregunta: string
  respuesta: string
  enlaces?: { etiqueta: string; href: string }[]
}

export const CATEGORIAS_FAQ: { id: CategoriaFaq; etiqueta: string }[] = [
  { id: 'general', etiqueta: 'SIAC' },
  { id: 'tramites', etiqueta: 'Trámites G1–G4' },
  { id: 'vigencias', etiqueta: 'Vigencias' },
  { id: 'documentos', etiqueta: 'Documentos' },
  { id: 'normativa', etiqueta: 'Decretos' },
]

export const CATALOGO_FAQ: EntradaFaq[] = [
  {
    id: 'que-es-siac',
    categoria: 'general',
    pregunta: '¿Qué es SIAC?',
    respuesta:
      'El Sistema Interno de Aseguramiento de la Calidad (SIAC) de la Universidad Autónoma del Cauca apoya el registro calificado y las condiciones institucionales: carga de evidencias, revisión, vigencias de anexos y métricas para la autoevaluación.',
  },
  {
    id: 'roles',
    categoria: 'general',
    pregunta: '¿Qué hace cada rol?',
    respuesta:
      'El Profesor sube documentos guía y anexos de vigencia. El Revisor dictamina evidencias en revisión. El Administrador configura programas, vigencias y métricas. El SuperAdmin gestiona usuarios globales.',
  },
  {
    id: 'g1-g4',
    categoria: 'tramites',
    pregunta: '¿Qué son G1, G2, G3 y G4?',
    respuesta:
      'G1 y G2 son documentos de programa (maestro y respaldo de mejoramiento en renovación). G3 y G4 son documentos institucionales (condiciones institucionales y su respaldo). Elija en «Cargar evidencia» el trámite y la guía que corresponda a su asignación.',
  },
  {
    id: 'sin-orden',
    categoria: 'tramites',
    pregunta: '¿Debo cargar los documentos en un orden fijo?',
    respuesta:
      'No hay una lista ordenada obligatoria: usted conoce qué documento le corresponde según el trámite activo de su programa. El sistema sugiere el trámite pero usted confirma la guía (G1–G4) antes de subir el .docx.',
  },
  {
    id: 'vigencia-registro',
    categoria: 'vigencias',
    pregunta: '¿Qué es la vigencia de registro de 7 años?',
    respuesta:
      'Tras registrar la resolución MEN, SIAC calcula el semáforo de vigencia (verde, amarillo, rojo) según los años transcurridos. La barra muestra el porcentaje del periodo de siete años.',
  },
  {
    id: 'anexos-vigencia',
    categoria: 'vigencias',
    pregunta: '¿Cuándo cargo anexos de vigencia?',
    respuesta:
      'Los anexos (permisos, convenios, infraestructura, etc.) se cargan mientras el programa está en trámite documental activo. Cuando el avance documental llega al 100 % del trámite, el programa deja de aparecer en el selector de nuevas cargas de vigencia.',
  },
  {
    id: 'plantillas',
    categoria: 'documentos',
    pregunta: '¿Dónde descargo plantillas oficiales?',
    respuesta:
      'En «Biblioteca de plantillas» encontrará formatos vigentes por tipo de trámite. Diligéncielos fuera del sistema y suba el .docx resultante como evidencia.',
  },
  {
    id: 'decreto-1330',
    categoria: 'normativa',
    pregunta: '¿Qué norma rige el proceso?',
    respuesta:
      'El Decreto 1330 de 2019 y sus anexos definen condiciones de programa e institución, documentos maestros y respaldos de mejoramiento que SIAC modela en las guías G1–G4.',
  },
]

const MAPA_ETIQUETA_CATEGORIA = new Map(
  CATEGORIAS_FAQ.map((c) => [c.id, c.etiqueta] as const),
)

export function etiquetaCategoriaFaq(categoria: CategoriaFaq): string {
  return MAPA_ETIQUETA_CATEGORIA.get(categoria) ?? categoria
}

export function buscarFaq(consulta: string, categoria?: CategoriaFaq): EntradaFaq[] {
  const q = consulta.trim().toLowerCase()
  return CATALOGO_FAQ.filter((entrada) => {
    if (categoria && entrada.categoria !== categoria) return false
    if (!q) return true
    return (
      entrada.pregunta.toLowerCase().includes(q) ||
      entrada.respuesta.toLowerCase().includes(q)
    )
  })
}
