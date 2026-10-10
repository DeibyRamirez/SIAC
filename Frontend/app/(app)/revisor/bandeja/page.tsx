'use client'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { ContenidoBandejaRevision } from '@/components/siac/contenido-bandeja-revision'

export default function BandejaRevisorPage() {
  return (
    <PlantillaPaginaApp titulo="Bandeja de revisión" rol="Revisor">
      <ContenidoBandejaRevision
        etiqueta="Dictamen documental"
        titulo="Bandeja de revisión"
        descripcion="Evidencias en estado «En revisión». Se muestran 10 por página; use las flechas para navegar."
        enlaceDetalle={(id) => `/revisor/bandeja/${id}`}
      />
    </PlantillaPaginaApp>
  )
}
