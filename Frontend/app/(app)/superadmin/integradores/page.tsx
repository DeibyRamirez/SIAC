'use client'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { PanelClavesIntegracion } from '@/components/siac/panel-claves-integracion'

export default function IntegradoresPage() {
  return (
    <PlantillaPaginaApp titulo="Claves de integración" rol="SuperAdmin">
      <PanelClavesIntegracion />
    </PlantillaPaginaApp>
  )
}
