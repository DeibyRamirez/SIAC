'use client'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { ContenidoBandejaRevision } from '@/components/siac/contenido-bandeja-revision'
import { ROLES_CONSULTA_INSTITUCIONAL } from '@/lib/auth-mock'

export default function BandejaRevisionAdministradorPage() {
  return (
    <PlantillaPaginaApp titulo="Bandeja de revisión" roles={ROLES_CONSULTA_INSTITUCIONAL}>
      <ContenidoBandejaRevision
        etiqueta="Supervisión institucional"
        titulo="Bandeja de revisión global"
        descripcion="Vista paginada de evidencias pendientes de dictamen en toda la institución."
        enlaceDetalle={(id) => `/administrador/evidencias/${id}`}
      />
    </PlantillaPaginaApp>
  )
}
