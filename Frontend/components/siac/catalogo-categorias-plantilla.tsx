'use client'

import { useMemo } from 'react'

import { TarjetaCategoriaPlantilla } from '@/components/siac/tarjeta-categoria-plantilla'
import { categoriasPlantilla, rutaPlantillasPorRol } from '@/lib/categorias-plantilla'
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
    return {
      Institucional: filtradas.filter((p) => p.categoria === 'Institucional').length,
      Programa: filtradas.filter((p) => p.categoria === 'Programa').length,
      Autoevaluacion: filtradas.filter((p) => p.categoria === 'Autoevaluacion').length,
    }
  }, [plantillas, soloVigentes])

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {categoriasPlantilla.map((meta) => (
        <TarjetaCategoriaPlantilla
          key={meta.slug}
          meta={meta}
          conteo={conteos[meta.categoria]}
          href={`${baseRuta}/${meta.slug}`}
        />
      ))}
    </div>
  )
}
