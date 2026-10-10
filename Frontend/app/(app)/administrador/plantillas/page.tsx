'use client'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { BibliotecaPlantillasContenido } from '@/components/siac/biblioteca-plantillas-contenido'

export default function PlantillasAdministradorPage() {
  return (
    <PlantillaPaginaApp titulo="Biblioteca de plantillas" rol="Administrador">
      <BibliotecaPlantillasContenido rol="Administrador" />
    </PlantillaPaginaApp>
  )
}
