import { Suspense } from 'react'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { ContenidoEvidenciasAdmin } from '@/components/siac/contenido-evidencias-admin'
import { ROLES_CONSULTA_INSTITUCIONAL } from '@/lib/auth-mock'
import { periodoAcademicoActual } from '@/lib/utilidades/periodo-academico'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function valorParam(
  params: Record<string, string | string[] | undefined>,
  clave: string,
): string | undefined {
  const valor = params[clave]
  if (Array.isArray(valor)) return valor[0]
  return valor
}

export default async function EvidenciasAdministradorPage({ searchParams }: PageProps) {
  const params = await searchParams

  const filtrosIniciales = {
    q: valorParam(params, 'q'),
    programaId: valorParam(params, 'programaId'),
    codigoGuia: valorParam(params, 'codigoGuia'),
    periodo: valorParam(params, 'periodo') ?? periodoAcademicoActual(),
    estado: valorParam(params, 'estado'),
    pagina: valorParam(params, 'pagina'),
  }

  return (
    <PlantillaPaginaApp titulo="Evidencias y documentos" roles={ROLES_CONSULTA_INSTITUCIONAL}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <ContenidoEvidenciasAdmin filtrosIniciales={filtrosIniciales} />
      </Suspense>
    </PlantillaPaginaApp>
  )
}
