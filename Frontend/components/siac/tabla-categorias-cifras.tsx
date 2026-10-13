'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { DialogoImportarCifras } from '@/components/siac/dialogo-importar-cifras'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { listarCategoriasCifrasApi, obtenerCifrasCategoriaApi } from '@/lib/servicios/cifras.servicio'
import type { CategoriaCifras, FuenteCifras } from '@/lib/tipos/cifras'
import { etiquetaFuente, formatearActualizadoBogota, varianteFuente } from '@/lib/utilidades/cifras'

interface ResumenCategoria {
  categoria: CategoriaCifras
  periodo: string | null
  fuente: FuenteCifras | null
  actualizadoEn: string | null
  tieneDatos: boolean
}

export function TablaCategoriasCifras() {
  const [resumenes, setResumenes] = useState<ResumenCategoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoriaImportar, setCategoriaImportar] = useState<CategoriaCifras | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const { categorias } = await listarCategoriasCifrasApi()
      const resultados = await Promise.all(
        categorias.map(async (categoria): Promise<ResumenCategoria> => {
          try {
            const respuesta = await obtenerCifrasCategoriaApi(categoria.id)
            return {
              categoria,
              periodo: respuesta.meta.periodo || null,
              fuente: respuesta.meta.fuente,
              actualizadoEn: respuesta.meta.actualizadoEn,
              tieneDatos: respuesta.indicadores.length > 0,
            }
          } catch {
            return {
              categoria,
              periodo: null,
              fuente: null,
              actualizadoEn: null,
              tieneDatos: false,
            }
          }
        }),
      )
      setResumenes(resultados)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar las categorías.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Descargue la plantilla de cada categoría, complete el Excel y súbalo. Las cifras del
          mismo periodo y desglose se reemplazan.
        </p>
        <Button type="button" variant="outline" onClick={() => void cargar()} disabled={cargando}>
          {cargando ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Actualizar
        </Button>
      </div>

      {error ? (
        <div className="space-y-3 rounded-xl border bg-white p-6">
          <p className="text-sm text-destructive">{error}</p>
          <Button type="button" onClick={() => void cargar()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead className="w-24">Variables</TableHead>
                <TableHead>Última carga</TableHead>
                <TableHead className="w-32 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cargando && resumenes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    Cargando categorías…
                  </TableCell>
                </TableRow>
              ) : (
                resumenes.map(({ categoria, periodo, fuente, actualizadoEn, tieneDatos }) => (
                  <TableRow key={categoria.id}>
                    <TableCell>
                      <p className="font-medium text-primary">{categoria.titulo}</p>
                      <p className="text-xs text-muted-foreground">{categoria.descripcion}</p>
                    </TableCell>
                    <TableCell>{categoria.variables?.length ?? 0}</TableCell>
                    <TableCell>
                      {tieneDatos && fuente ? (
                        <span className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Periodo {periodo ?? '—'}</span>
                          <Badge variant={varianteFuente(fuente)}>{etiquetaFuente(fuente)}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatearActualizadoBogota(actualizadoEn ?? undefined)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin cargas</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCategoriaImportar(categoria)}
                      >
                        <FileSpreadsheet className="size-4" />
                        Importar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {categoriaImportar ? (
        <DialogoImportarCifras
          categoriaId={categoriaImportar.id}
          categoriaTitulo={categoriaImportar.titulo}
          abierto={Boolean(categoriaImportar)}
          onAbiertoCambiar={(abierto) => {
            if (!abierto) setCategoriaImportar(null)
          }}
          onImportado={() => {
            toast.success(`Cifras de ${categoriaImportar.titulo} importadas.`)
            void cargar()
          }}
        />
      ) : null}
    </div>
  )
}
