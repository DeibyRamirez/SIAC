import type { TipoTramitePlantilla } from '@/lib/tipos'

export type SlugAccesoPlantilla = 'renovacion' | 'nuevos'

export interface MetaAccesoPlantilla {
  slug: SlugAccesoPlantilla
  titulo: string
  descripcion: string
  imagenUrl: string
  tiposTramite: TipoTramitePlantilla[]
}

/** Dos accesos principales: Renovación y Nuevos (Decreto 1330 / G1–G4). */
export const accesosPlantilla: MetaAccesoPlantilla[] = [
  {
    slug: 'renovacion',
    titulo: 'Renovación',
    descripcion:
      'Documentos guía para renovación de registro calificado (G1 + G2) y condiciones institucionales (G3 + G4).',
    imagenUrl: '/Categorias/Auto_Renov.png',
    tiposTramite: ['Renovacion', 'General'],
  },
  {
    slug: 'nuevos',
    titulo: 'Nuevos',
    descripcion:
      'Documentos guía para registro calificado nuevo (G1) y condiciones institucionales nuevas (G3).',
    imagenUrl: '/Categorias/CP.png',
    tiposTramite: ['NuevoPrograma', 'General'],
  },
]

/** @deprecated Usar accesosPlantilla */
export const categoriasPlantilla = accesosPlantilla

export function accesoDesdeSlug(slug: string): MetaAccesoPlantilla | undefined {
  return accesosPlantilla.find((item) => item.slug === slug)
}

/** @deprecated Usar accesoDesdeSlug */
export function categoriaDesdeSlug(slug: string): MetaAccesoPlantilla | undefined {
  return accesoDesdeSlug(slug)
}

export function rutaPlantillasPorRol(rol: 'Administrador' | 'Cargador'): string {
  return rol === 'Administrador' ? '/administrador/plantillas' : '/cargador/plantillas'
}
