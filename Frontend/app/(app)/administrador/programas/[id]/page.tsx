'use client'

import { useParams } from 'next/navigation'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { DetalleProcesoSIAC } from '@/components/siac/detalle-proceso-siac'
import { ROLES_PANEL_PROGRAMAS } from '@/lib/constantes/roles'

export default function DetalleProgramaPage() {
  return (
    <PlantillaPaginaApp titulo="Resumen del programa" roles={ROLES_PANEL_PROGRAMAS}>
      <ContenidoDetallePrograma />
    </PlantillaPaginaApp>
  )
}

function ContenidoDetallePrograma() {
  const params = useParams<{ id: string }>()
  return <DetalleProcesoSIAC entidadId={params.id} />
}
