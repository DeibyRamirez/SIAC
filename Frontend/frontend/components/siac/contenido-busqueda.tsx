'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { InsigniaEstado } from '@/components/siac/insignia-estado'
import { PanelVacio } from '@/components/siac/tarjeta-acceso'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { factoresSemilla, periodosSemilla, programasSemilla } from '@/lib/datos-semilla'
import { formatearFecha, obtenerNombrePrograma } from '@/lib/utilidades-siac'

interface ParametrosBusqueda {
  q?: string
  programa?: string
  factor?: string
  periodo?: string
}

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
    const factor = parametrosIniciales.factor ?? ''
    const periodo = parametrosIniciales.periodo ?? ''

    return datos.evidencias.filter((evidencia) => {
      if (evidencia.estado !== 'Validado') {
        return false
      }

      const coincideTexto =
        !texto ||
        [
          evidencia.nombre,
          evidencia.indicador,
          evidencia.factor,
          obtenerNombrePrograma(evidencia.programaId),
        ]
          .join(' ')
          .toLowerCase()
          .includes(texto)

      const coincidePrograma = !programa || evidencia.programaId === programa
      const coincideFactor = !factor || evidencia.factor === factor
      const coincidePeriodo = !periodo || evidencia.periodo === periodo

      return coincideTexto && coincidePrograma && coincideFactor && coincidePeriodo
    })
  }, [datos.evidencias, parametrosIniciales])

  function actualizarFiltros(formData: FormData) {
    const params = new URLSearchParams()
    const q = String(formData.get('q') ?? '').trim()
    const programa = String(formData.get('programa') ?? '')
    const factor = String(formData.get('factor') ?? '')
    const periodo = String(formData.get('periodo') ?? '')

    if (q) params.set('q', q)
    if (programa) params.set('programa', programa)
    if (factor) params.set('factor', factor)
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
                placeholder="Buscar por nombre, factor o indicador"
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
                {programasSemilla.map((programa) => (
                  <option key={programa.id} value={programa.id}>
                    {programa.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Factor</span>
              <select
                name="factor"
                defaultValue={parametrosIniciales.factor ?? ''}
                className="w-full rounded-lg border border-input px-3 py-2"
              >
                <option value="">Todos</option>
                {factoresSemilla.map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
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
                {periodosSemilla.map((valor) => (
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
        <Card>
          <CardContent className="overflow-x-auto pt-6">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4">Documento</th>
                  <th className="py-3 pr-4">Programa</th>
                  <th className="py-3 pr-4">Factor</th>
                  <th className="py-3 pr-4">Periodo</th>
                  <th className="py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((evidencia) => (
                  <tr key={evidencia.id} className="border-b border-border/70">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-[#102f55]">{evidencia.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatearFecha(evidencia.fechaCarga)}
                      </p>
                    </td>
                    <td className="py-3 pr-4">{obtenerNombrePrograma(evidencia.programaId)}</td>
                    <td className="py-3 pr-4">{evidencia.factor}</td>
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
