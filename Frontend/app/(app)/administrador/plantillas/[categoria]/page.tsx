'use client'

import Link from 'next/link'
import { use, useMemo, useState } from 'react'
import type { TipoTramitePlantilla } from '@/lib/tipos'
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
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  actualizarPlantillaApi,
  subirArchivoPlantillaApi,
} from '@/lib/servicios/plantillas.servicio'
import type { Plantilla } from '@/lib/tipos'
import { extraerMetadatosDocx } from '@/lib/utilidades/extraer-metadatos-docx'
import { catalogoFactoresIndicadores } from '@/lib/datos-semilla'

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
  const [tipoTramite, setTipoTramite] = useState<'todos' | 'Renovacion' | 'NuevoPrograma'>(
    'todos',
  )
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [editando, setEditando] = useState<Plantilla | null>(null)
  const [formulario, setFormulario] = useState({
    nombre: '',
    factor: '',
    version: '2026.1',
    vigente: true,
    categoria: meta.categoria,
    descripcion: '',
    tipoTramite: 'General' as TipoTramitePlantilla,
    esGuiaDocumentoMaestro: false,
  })
  const [archivoPlantilla, setArchivoPlantilla] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)

  const plantillasFiltradas = useMemo(() => {
    return datos.plantillas.filter((p) => {
      if (p.categoria !== meta.categoria) return false
      if (tipoTramite !== 'todos' && p.tipoTramite !== tipoTramite) return false
      const texto = busqueda.toLowerCase()
      return (
        p.nombre.toLowerCase().includes(texto) ||
        p.factor.toLowerCase().includes(texto)
      )
    })
  }, [datos.plantillas, meta.categoria, busqueda, tipoTramite])

  const abrirCrear = () => {
    setEditando(null)
    setFormulario({
      nombre: '',
      factor: '',
      version: '2026.1',
      vigente: true,
      categoria: meta.categoria,
      descripcion: '',
      tipoTramite: 'General',
      esGuiaDocumentoMaestro: false,
    })
    setArchivoPlantilla(null)
    setDialogoAbierto(true)
  }

  const abrirEditar = (plantilla: Plantilla) => {
    setEditando(plantilla)
    setFormulario({
      nombre: plantilla.nombre,
      factor: plantilla.factor,
      version: plantilla.version,
      vigente: plantilla.vigente,
      categoria: plantilla.categoria,
      descripcion: plantilla.descripcion ?? '',
      tipoTramite: plantilla.tipoTramite ?? 'General',
      esGuiaDocumentoMaestro: plantilla.esGuiaDocumentoMaestro ?? false,
    })
    setArchivoPlantilla(null)
    setDialogoAbierto(true)
  }

  async function manejarArchivoPlantilla(file: File | null) {
    setArchivoPlantilla(file)
    if (!file) return
    const nombreBase = file.name.replace(/\.docx$/i, '').replace(/[_-]+/g, ' ').trim()
    setFormulario((prev) => ({ ...prev, nombre: nombreBase || prev.nombre }))
    try {
      const meta = await extraerMetadatosDocx(file, [], catalogoFactoresIndicadores)
      if (meta.factor) setFormulario((prev) => ({ ...prev, factor: meta.factor! }))
      if (/documento\s*maestro/i.test(file.name)) {
        setFormulario((prev) => ({ ...prev, esGuiaDocumentoMaestro: true }))
      }
    } catch {
      // El usuario puede completar metadatos manualmente
    }
  }

  const guardar = async () => {
    if (!formulario.nombre.trim() || !formulario.factor.trim()) {
      toast.error('Nombre y factor son obligatorios.')
      return
    }
    if (!editando && !archivoPlantilla) {
      toast.error('Selecciona un archivo .docx para la plantilla.')
      return
    }
    if (archivoPlantilla && !archivoPlantilla.name.toLowerCase().endsWith('.docx')) {
      toast.error('Solo se permiten archivos .docx.')
      return
    }

    setGuardando(true)
    try {
      const payload = {
        ...formulario,
        nombre: formulario.nombre.trim(),
        factor: formulario.factor.trim(),
        formato: 'DOCX' as const,
        descripcion: formulario.descripcion.trim() || undefined,
      }

      if (editando) {
        if (apiDisponible()) {
          await actualizarPlantillaApi(editando.id, {
            nombre: payload.nombre,
            factor: payload.factor,
            version: payload.version,
            descripcion: payload.descripcion,
            vigente: payload.vigente,
            tipoTramite: payload.tipoTramite,
            esGuiaDocumentoMaestro: payload.esGuiaDocumentoMaestro,
          })
          if (archivoPlantilla) {
            await subirArchivoPlantillaApi(editando.id, archivoPlantilla)
          }
        }
        actualizarPlantilla(editando.id, payload)
        toast.success('Plantilla actualizada.')
      } else {
        await crearPlantilla(payload, archivoPlantilla ?? undefined)
        toast.success('Plantilla creada y almacenada en el bucket de plantillas.')
      }
      setDialogoAbierto(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la plantilla.')
    } finally {
      setGuardando(false)
    }
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

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar en esta categoría…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="max-w-md"
        />
        <select
          value={tipoTramite}
          onChange={(e) =>
            setTipoTramite(e.target.value as 'todos' | 'Renovacion' | 'NuevoPrograma')
          }
          className="rounded-lg border border-input px-3 py-2 text-sm"
        >
          <option value="todos">Todos los trámites</option>
          <option value="Renovacion">Renovación</option>
          <option value="NuevoPrograma">Nuevo programa</option>
        </select>
      </div>

      <RejillaPlantillas
        plantillas={plantillasFiltradas}
        onEditar={abrirEditar}
        onEliminar={async (id) => {
          await eliminarPlantilla(id)
          toast.success('Plantilla deshabilitada.')
        }}
      />

      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar plantilla' : 'Nueva plantilla'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="archivo-plt">
                Archivo Word (.docx){editando ? ' — opcional para reemplazar' : ''}
              </Label>
              <input
                id="archivo-plt"
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="w-full rounded-lg border border-dashed border-input px-3 py-2 text-sm"
                onChange={(e) => manejarArchivoPlantilla(e.target.files?.[0] ?? null)}
              />
            </div>
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
                <Label>Trámite</Label>
                <Select
                  value={formulario.tipoTramite}
                  onValueChange={(v) =>
                    setFormulario({
                      ...formulario,
                      tipoTramite: v as TipoTramitePlantilla,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Renovacion">Renovación</SelectItem>
                    <SelectItem value="NuevoPrograma">Nuevo programa</SelectItem>
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formulario.esGuiaDocumentoMaestro}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    esGuiaDocumentoMaestro: e.target.checked,
                  })
                }
                className="size-4 rounded border-input accent-primary"
              />
              Es guía de Documento Maestro
            </label>
            <p className="text-xs text-muted-foreground">
              El archivo se almacena en el bucket Supabase «plantillas», no en el repositorio del
              proyecto.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
