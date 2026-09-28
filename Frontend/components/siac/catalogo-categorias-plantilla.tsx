'use client'

import { useMemo } from 'react'

import { TarjetaCategoriaPlantilla } from '@/components/siac/tarjeta-categoria-plantilla'
import { accesosPlantilla, rutaPlantillasPorRol } from '@/lib/categorias-plantilla'
import type { Plantilla } from '@/lib/tipos'

interface CatalogoCategoriasPlantillaProps {
  plantillas: Plantilla[]
  rol: 'Administrador' | 'Cargador'
  soloVigentes?: boolean
}

export function CatalogoCategoriasPlantilla({
  plantillas,
  rol,
  soloVigentes = false,
}: CatalogoCategoriasPlantillaProps) {
  const baseRuta = rutaPlantillasPorRol(rol)

  const conteos = useMemo(() => {
    const filtradas = soloVigentes ? plantillas.filter((p) => p.vigente) : plantillas
    const mapa: Record<string, number> = {}
    for (const acceso of accesosPlantilla) {
      mapa[acceso.slug] = filtradas.filter((p) =>
        acceso.tiposTramite.includes(p.tipoTramite ?? 'General'),
      ).length
    }
    return mapa
  }, [plantillas, soloVigentes])

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {accesosPlantilla.map((meta) => (
        <TarjetaCategoriaPlantilla
          key={meta.slug}
          meta={meta}
          conteo={conteos[meta.slug] ?? 0}
          href={`${baseRuta}/${meta.slug}`}
        />
      ))}
    </div>
  )
}
