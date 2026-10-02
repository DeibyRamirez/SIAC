'use client'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { DetalleProcesoSIAC } from '@/components/siac/detalle-proceso-siac'
import { ROLES_CONSULTA_INSTITUCIONAL } from '@/lib/auth-mock'

export default function DetalleInstitucionPage() {
  return (
    <PlantillaPaginaApp titulo="Proceso institucional" roles={ROLES_CONSULTA_INSTITUCIONAL}>
      <DetalleProcesoSIAC esInstitucion />
    </PlantillaPaginaApp>
  )
}
