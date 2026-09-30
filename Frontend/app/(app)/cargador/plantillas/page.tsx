'use client'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { BibliotecaPlantillasContenido } from '@/components/siac/biblioteca-plantillas-contenido'

export default function PlantillasCargadorPage() {
  return (
    <PlantillaPaginaApp titulo="Biblioteca de plantillas" rol="Cargador">
      <BibliotecaPlantillasContenido rol="Cargador" />
    </PlantillaPaginaApp>
  )
}
