'use client'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { DetalleProcesoSIAC } from '@/components/siac/detalle-proceso-siac'
import { ROLES_PANEL_PROGRAMAS } from '@/lib/constantes/roles'

export default function DetalleInstitucionPage() {
  return (
    <PlantillaPaginaApp titulo="Proceso institucional" roles={ROLES_PANEL_PROGRAMAS}>
      <DetalleProcesoSIAC esInstitucion />
    </PlantillaPaginaApp>
  )
}
