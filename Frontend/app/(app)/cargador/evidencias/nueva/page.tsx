'use client'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { FormularioNuevaEvidencia } from '@/components/siac/formulario-nueva-evidencia'

export default function NuevaEvidenciaPage() {
  return (
    <PlantillaPaginaApp titulo="Cargar evidencia" rol="Cargador">
      <FormularioNuevaEvidencia modo="cargador" />
    </PlantillaPaginaApp>
  )
}
