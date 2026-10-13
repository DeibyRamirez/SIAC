'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { categoriasInformesPowerBi } from '@/lib/informes-powerbi'
import {
  actualizarVariableCifraApi,
  listarCategoriasCifrasApi,
  listarVariablesCifrasApi,
} from '@/lib/servicios/cifras.servicio'
import type { CategoriaCifras, VariableCifra } from '@/lib/tipos/cifras'
import { manejarCambioSelect } from '@/lib/utilidades-siac'

const TODAS = 'todas'

function tituloCategoria(categoriaId: string): string {
  return (
    categoriasInformesPowerBi.find((categoria) => categoria.id === categoriaId)?.titulo ??
    categoriaId
  )
}

export function DiccionarioVariablesCifras() {
  const [variables, setVariables] = useState<VariableCifra[]>([])
  const [categorias, setCategorias] = useState<CategoriaCifras[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState(TODAS)
  const [edicion, setEdicion] = useState<VariableCifra | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const [{ variables: lista }, { categorias: catalogo }] = await Promise.all([
        listarVariablesCifrasApi(),
        listarCategoriasCifrasApi(),
      ])
      setVariables(lista)
      setCategorias(catalogo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar el diccionario.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const opcionesCategoria = useMemo(() => {
    const ids = Array.from(new Set(variables.map((variable) => variable.categoriaId))).sort()
    return [
      { value: TODAS, label: 'Todas las categorías' },
      ...ids.map((id) => ({ value: id, label: tituloCategoria(id) })),
    ]
  }, [variables])

  const visibles = useMemo(
    () =>
      filtroCategoria === TODAS
        ? variables
        : variables.filter((variable) => variable.categoriaId === filtroCategoria),
    [variables, filtroCategoria],
  )

  const esquemaSeleccionado = useMemo(() => {
    if (filtroCategoria === TODAS) return null
    const esquema = categorias.find((categoria) => categoria.id === filtroCategoria)?.esquema
    return esquema && esquema.length > 0 ? esquema : null
  }, [categorias, filtroCategoria])

  const guardarEdicion = async () => {
    if (!edicion) return
    const etiquetaCuac = edicion.etiquetaCuac.trim()
    if (!etiquetaCuac) return
    setGuardando(true)
    try {
      const actualizada = await actualizarVariableCifraApi(edicion.id, {
        etiquetaCuac,
        descripcion: edicion.descripcion ?? '',
        activo: edicion.activo,
      })
      setVariables((previas) =>
        previas.map((variable) => (variable.id === actualizada.id ? actualizada : variable)),
      )
      toast.success(`Variable «${actualizada.clave}» actualizada.`)
      setEdicion(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No fue posible actualizar la variable.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Edite la etiqueta visible de cada variable (etiqueta CUAC), su descripción o actívela y
          desactívela. Los paneles de cifras usan estas etiquetas.
        </p>
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Categoría</span>
          <Select
            value={filtroCategoria}
            items={opcionesCategoria}
            onValueChange={manejarCambioSelect(setFiltroCategoria)}
          >
            <SelectTrigger className="w-[230px]" aria-label="Filtrar por categoría">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              {opcionesCategoria.map((opcion) => (
                <SelectItem key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      {!error && esquemaSeleccionado ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">
            Columnas del esquema (carga por registros)
          </p>
          <div className="rounded-xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Columna</TableHead>
                  <TableHead>Clave</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Obligatoria</TableHead>
                  <TableHead>Valores permitidos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {esquemaSeleccionado.map((columna) => (
                  <TableRow key={columna.clave}>
                    <TableCell className="font-medium text-primary">
                      {columna.encabezado}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{columna.clave}</TableCell>
                    <TableCell>{columna.tipo}</TableCell>
                    <TableCell>{columna.obligatoria ? 'Sí' : 'No'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {columna.enum?.join(' | ') ?? columna.descripcion ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="space-y-3 rounded-xl border bg-white p-6">
          <p className="text-sm text-destructive">{error}</p>
          <Button type="button" onClick={() => void cargar()}>
            Reintentar
          </Button>
        </div>
      ) : esquemaSeleccionado ? (
        <p className="text-sm text-muted-foreground">
          Esta categoría se carga por registros (Excel o JSON); las columnas válidas se muestran
          arriba. Las categorías de bienestar y relaciones-entorno usan variables clave/valor.
        </p>
      ) : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead>Clave</TableHead>
                <TableHead>Etiqueta CUAC</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Dimensiones</TableHead>
                <TableHead className="w-24">Estado</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cargando && variables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Cargando diccionario…
                  </TableCell>
                </TableRow>
              ) : visibles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No hay variables para la categoría seleccionada.
                  </TableCell>
                </TableRow>
              ) : (
                visibles.map((variable) => (
                  <TableRow key={variable.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {tituloCategoria(variable.categoriaId)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{variable.clave}</TableCell>
                    <TableCell className="font-medium text-primary">
                      {variable.etiquetaCuac}
                    </TableCell>
                    <TableCell>{variable.unidad}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {variable.dimensiones.length > 0 ? variable.dimensiones.join(', ') : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={variable.activo ? 'esmeralda' : 'outline'}>
                        {variable.activo ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Editar ${variable.clave}`}
                        onClick={() => setEdicion({ ...variable })}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(edicion)} onOpenChange={(abierto) => (!abierto ? setEdicion(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar variable</DialogTitle>
            <DialogDescription>
              {edicion ? `${tituloCategoria(edicion.categoriaId)} · ${edicion.clave}` : ''}
            </DialogDescription>
          </DialogHeader>

          {edicion ? (
            <div className="space-y-4">
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Etiqueta CUAC</span>
                <Input
                  value={edicion.etiquetaCuac}
                  aria-label="Etiqueta CUAC"
                  onChange={(evento) =>
                    setEdicion({ ...edicion, etiquetaCuac: evento.target.value })
                  }
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Descripción</span>
                <Textarea
                  value={edicion.descripcion ?? ''}
                  aria-label="Descripción"
                  rows={3}
                  onChange={(evento) =>
                    setEdicion({ ...edicion, descripcion: evento.target.value })
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--esmeralda)]"
                  checked={edicion.activo}
                  onChange={(evento) =>
                    setEdicion({ ...edicion, activo: evento.target.checked })
                  }
                />
                Variable activa
              </label>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEdicion(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void guardarEdicion()}
              disabled={guardando || !edicion?.etiquetaCuac.trim()}
            >
              {guardando ? <Loader2 className="size-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
