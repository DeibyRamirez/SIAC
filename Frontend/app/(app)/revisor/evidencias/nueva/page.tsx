'use client'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { FormularioNuevaEvidencia } from '@/components/siac/formulario-nueva-evidencia'

export default function NuevaEvidenciaRevisorPage() {
  return (
    <PlantillaPaginaApp titulo="Cargar trámite" rol="Revisor">
      <FormularioNuevaEvidencia modo="revisor" />
    </PlantillaPaginaApp>
  )
}
