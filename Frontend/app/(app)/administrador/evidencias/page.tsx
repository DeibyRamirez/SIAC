import { redirect } from 'next/navigation'

import {
  construirQueryBusqueda,
  leerFiltrosBusquedaUrl,
  valorParamUrl,
} from '@/lib/utilidades/parametros-busqueda-url'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Redirige al listado canónico HU-008 preservando los filtros en la URL. */
export default async function EvidenciasAdministradorPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filtros = leerFiltrosBusquedaUrl(params)

  if (!filtros.programa) {
    const programaId = valorParamUrl(params, 'programaId')
    if (programaId) filtros.programa = programaId
  }

  const qs = construirQueryBusqueda(filtros)
  redirect(qs ? `/administrador/busqueda?${qs}` : '/administrador/busqueda')
}
