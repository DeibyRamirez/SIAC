import { Suspense } from 'react'

import { GuardiaSesion } from '@/components/auth/guardia-sesion'
import { ContenidoBusqueda } from '@/components/siac/contenido-busqueda'
import { ShellAplicacion } from '@/components/layout/shell-aplicacion'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'

interface BusquedaPageProps {
  searchParams: Promise<{
    q?: string
    programa?: string
    factor?: string
    periodo?: string
  }>
}

export default async function BusquedaPage({ searchParams }: BusquedaPageProps) {
  const parametros = await searchParams

  return (
    <GuardiaSesion rolPermitido="Administrador">
      <ShellAplicacion titulo="Búsqueda de evidencias">
        <EncabezadoPagina
          etiqueta="HU-008"
          titulo="Búsqueda empresarial"
          descripcion="Filtra evidencias validadas. Los parámetros se sincronizan en la URL para compartir la vista."
        />
        <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando resultados...</p>}>
          <ContenidoBusqueda parametrosIniciales={parametros} />
        </Suspense>
      </ShellAplicacion>
    </GuardiaSesion>
  )
}
