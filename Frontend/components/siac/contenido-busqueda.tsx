'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { InsigniaEstado } from '@/components/siac/insignia-estado'
import { PanelVacio } from '@/components/siac/tarjeta-acceso'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { CodigoDocumentoGuia } from '@/lib/tipos'
import { ETIQUETAS_GUIA } from '@/lib/utilidades/catalogo-tramites-siac'
import { periodosConActual } from '@/lib/utilidades/periodo-academico'
import { formatearFecha, obtenerNombrePrograma } from '@/lib/utilidades-siac'

interface ParametrosBusqueda {
  q?: string
  programa?: string
  codigoGuia?: string
  periodo?: string
}

const CODIGOS_GUIA = Object.keys(ETIQUETAS_GUIA) as CodigoDocumentoGuia[]

export function ContenidoBusqueda({
  parametrosIniciales,
}: {
  parametrosIniciales: ParametrosBusqueda
}) {
  const router = useRouter()
  const { datos } = usarAlmacen()

  const resultados = useMemo(() => {
    const texto = (parametrosIniciales.q ?? '').trim().toLowerCase()
    const programa = parametrosIniciales.programa ?? ''
    const codigoGuia = parametrosIniciales.codigoGuia ?? ''
    const periodo = parametrosIniciales.periodo ?? ''

    return datos.evidencias.filter((evidencia) => {
      if (evidencia.estado !== 'Validado') {
        return false
      }

      const coincideTexto =
        !texto ||
        [
          evidencia.nombre,
          evidencia.codigoGuia ?? '',
          obtenerNombrePrograma(evidencia.programaId, datos.programas),
        ]
          .join(' ')
          .toLowerCase()
          .includes(texto)

      const coincidePrograma = !programa || evidencia.programaId === programa
      const coincideGuia = !codigoGuia || evidencia.codigoGuia === codigoGuia
      const coincidePeriodo = !periodo || evidencia.periodo === periodo

      return coincideTexto && coincidePrograma && coincideGuia && coincidePeriodo
    })
  }, [datos.evidencias, datos.programas, parametrosIniciales])

  function actualizarFiltros(formData: FormData) {
    const params = new URLSearchParams()
    const q = String(formData.get('q') ?? '').trim()
    const programa = String(formData.get('programa') ?? '')
    const codigoGuia = String(formData.get('codigoGuia') ?? '')
    const periodo = String(formData.get('periodo') ?? '')

    if (q) params.set('q', q)
    if (programa) params.set('programa', programa)
    if (codigoGuia) params.set('codigoGuia', codigoGuia)
    if (periodo) params.set('periodo', periodo)

    router.push(`/administrador/busqueda?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <form action={actualizarFiltros} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block space-y-2 text-sm md:col-span-2 xl:col-span-4">
              <span className="font-medium">Texto</span>
              <input
                name="q"
                defaultValue={parametrosIniciales.q ?? ''}
                className="w-full rounded-lg border border-input px-3 py-2"
                placeholder="Buscar por nombre, programa o guía (G1–G4)"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Programa</span>
              <select
                name="programa"
                defaultValue={parametrosIniciales.programa ?? ''}
                className="w-full rounded-lg border border-input px-3 py-2"
              >
                <option value="">Todos</option>
                {datos.programas.map((programa) => (
                  <option key={programa.id} value={programa.id}>
                    {programa.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Guía</span>
              <select
                name="codigoGuia"
                defaultValue={parametrosIniciales.codigoGuia ?? ''}
                className="w-full rounded-lg border border-input px-3 py-2"
              >
                <option value="">Todas</option>
                {CODIGOS_GUIA.map((codigo) => (
                  <option key={codigo} value={codigo}>
                    {codigo} — {ETIQUETAS_GUIA[codigo]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Periodo</span>
              <select
                name="periodo"
                defaultValue={parametrosIniciales.periodo ?? ''}
                className="w-full rounded-lg border border-input px-3 py-2"
              >
                <option value="">Todos</option>
                {periodosConActual().map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
            </label>
            <div className="md:col-span-2 xl:col-span-4">
              <Button type="submit">Aplicar filtros</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {resultados.length === 0 ? (
        <PanelVacio mensaje="No se encontraron evidencias." />
      ) : (
        <Card className="border-l-4 border-cyan-tecnico">
          <CardContent className="overflow-x-auto pt-6">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-primary/10 bg-primary/5 text-xs font-bold tracking-wide text-primary uppercase">
                  <th className="py-3 pr-4">Documento</th>
                  <th className="py-3 pr-4">Programa</th>
                  <th className="py-3 pr-4">Guía</th>
                  <th className="py-3 pr-4">Periodo</th>
                  <th className="py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((evidencia) => (
                  <tr key={evidencia.id} className="border-b border-border/70">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-primary">{evidencia.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatearFecha(evidencia.fechaCarga)}
                      </p>
                    </td>
                    <td className="py-3 pr-4">{obtenerNombrePrograma(evidencia.programaId, datos.programas)}</td>
                    <td className="py-3 pr-4">{evidencia.codigoGuia ?? '—'}</td>
                    <td className="py-3 pr-4">{evidencia.periodo}</td>
                    <td className="py-3">
                      <InsigniaEstado estado={evidencia.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
