'use client'

import Link from 'next/link'
import { use, useMemo, useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { notFound } from 'next/navigation'
import { toast } from 'sonner'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { RejillaPlantillas } from '@/components/siac/rejilla-plantillas'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { categoriaDesdeSlug } from '@/lib/categorias-plantilla'
import type { Plantilla } from '@/lib/tipos'

export default function PlantillasCategoriaAdminPage({
  params,
}: {
  params: Promise<{ categoria: string }>
}) {
  const { categoria: slug } = use(params)
  const meta = categoriaDesdeSlug(slug)

  if (!meta) {
    notFound()
  }

  return (
    <PlantillaPaginaApp titulo="Biblioteca de plantillas" rol="Administrador">
      <ContenidoCategoria meta={meta} />
    </PlantillaPaginaApp>
  )
}

function ContenidoCategoria({
  meta,
}: {
  meta: NonNullable<ReturnType<typeof categoriaDesdeSlug>>
}) {
  const { datos, crearPlantilla, actualizarPlantilla, eliminarPlantilla } = usarAlmacen()
  const [busqueda, setBusqueda] = useState('')
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [editando, setEditando] = useState<Plantilla | null>(null)
  const [formulario, setFormulario] = useState({
    nombre: '',
    factor: '',
    formato: 'DOCX' as Plantilla['formato'],
    version: 'v1.0',
    vigente: true,
    categoria: meta.categoria,
    descripcion: '',
    urlDocumento: '',
  })

  const plantillasFiltradas = useMemo(() => {
    return datos.plantillas.filter((p) => {
      if (p.categoria !== meta.categoria) return false
      const texto = busqueda.toLowerCase()
      return (
        p.nombre.toLowerCase().includes(texto) ||
        p.factor.toLowerCase().includes(texto)
      )
    })
  }, [datos.plantillas, meta.categoria, busqueda])

  const abrirCrear = () => {
    setEditando(null)
    setFormulario({
      nombre: '',
      factor: '',
      formato: 'DOCX',
      version: 'v1.0',
      vigente: true,
      categoria: meta.categoria,
      descripcion: '',
      urlDocumento: '',
    })
    setDialogoAbierto(true)
  }

  const abrirEditar = (plantilla: Plantilla) => {
    setEditando(plantilla)
    setFormulario({
      nombre: plantilla.nombre,
      factor: plantilla.factor,
      formato: plantilla.formato,
      version: plantilla.version,
      vigente: plantilla.vigente,
      categoria: plantilla.categoria,
      descripcion: plantilla.descripcion ?? '',
      urlDocumento: plantilla.urlDocumento ?? '',
    })
    setDialogoAbierto(true)
  }

  const guardar = () => {
    if (!formulario.nombre) {
      toast.error('El nombre es obligatorio.')
      return
    }
    const payload = {
      ...formulario,
      urlDocumento: formulario.urlDocumento.trim() || undefined,
    }
    if (editando) {
      actualizarPlantilla(editando.id, payload)
      toast.success('Plantilla actualizada.')
    } else {
      crearPlantilla(payload)
      toast.success('Plantilla creada.')
    }
    setDialogoAbierto(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="borde-institucional space-y-2">
          <Link
            href="/administrador/plantillas"
            className="inline-flex items-center gap-1 text-sm font-medium text-cyan-tecnico hover:underline"
          >
            <ArrowLeft className="size-4" />
            Biblioteca de plantillas
          </Link>
          <p className="text-[11px] font-bold tracking-[0.14em] text-esmeralda uppercase">
            {meta.titulo}
          </p>
          <h1 className="text-2xl font-bold text-primary">{meta.titulo}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{meta.descripcion}</p>
        </div>
        <Button onClick={abrirCrear}>
          <Plus className="size-4" />
          Nueva plantilla
        </Button>
      </div>

      <Input
        placeholder="Buscar en esta categoría…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="max-w-md"
      />

      <RejillaPlantillas
        plantillas={plantillasFiltradas}
        onEditar={abrirEditar}
        onEliminar={(id) => {
          eliminarPlantilla(id)
          toast.success('Plantilla eliminada.')
        }}
      />

      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar plantilla' : 'Nueva plantilla'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre-plt">Nombre</Label>
              <Input
                id="nombre-plt"
                value={formulario.nombre}
                onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="factor-plt">Factor / condición</Label>
              <Input
                id="factor-plt"
                value={formulario.factor}
                onChange={(e) => setFormulario({ ...formulario, factor: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Formato</Label>
                <Select
                  value={formulario.formato}
                  onValueChange={(v) =>
                    setFormulario({ ...formulario, formato: v as Plantilla['formato'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOCX">DOCX</SelectItem>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="XLSX">XLSX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="version-plt">Versión</Label>
                <Input
                  id="version-plt"
                  value={formulario.version}
                  onChange={(e) => setFormulario({ ...formulario, version: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc-plt">Descripción</Label>
              <Input
                id="desc-plt"
                value={formulario.descripcion}
                onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url-plt">URL del documento (opcional)</Label>
              <Input
                id="url-plt"
                placeholder="/SIAC_Documentacion_Proyecto.pdf"
                value={formulario.urlDocumento}
                onChange={(e) => setFormulario({ ...formulario, urlDocumento: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Ruta pública en la carpeta public. Solo PDF permite vista previa en línea.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
