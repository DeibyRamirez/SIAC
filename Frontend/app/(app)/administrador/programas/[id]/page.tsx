'use client'

import { useParams } from 'next/navigation'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { DetalleProcesoSIAC } from '@/components/siac/detalle-proceso-siac'
import { ROLES_CONSULTA_INSTITUCIONAL } from '@/lib/auth-mock'

export default function DetalleProgramaPage() {
  return (
    <PlantillaPaginaApp titulo="Resumen del programa" roles={ROLES_CONSULTA_INSTITUCIONAL}>
      <ContenidoDetallePrograma />
    </PlantillaPaginaApp>
  )
}

function ContenidoDetallePrograma() {
  const params = useParams<{ id: string }>()
  return <DetalleProcesoSIAC entidadId={params.id} />
}
