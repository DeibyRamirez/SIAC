'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { CodigoDocumentoGuia, TipoTramitePlantilla } from '@/lib/tipos'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { RejillaPlantillas } from '@/components/siac/rejilla-plantillas'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
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
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  actualizarPlantillaApi,
  subirArchivoPlantillaApi,
} from '@/lib/servicios/plantillas.servicio'
import type { Plantilla } from '@/lib/tipos'
import { ETIQUETAS_GUIA } from '@/lib/utilidades/catalogo-tramites-siac'

const PATRON_GUIA_EN_NOMBRE = /\bG([1-4])\b/i

function guiaDesdeNombreArchivo(nombreArchivo: string): CodigoDocumentoGuia | undefined {
  const coincidencia = nombreArchivo.match(PATRON_GUIA_EN_NOMBRE)
  return coincidencia ? (`G${coincidencia[1]}` as CodigoDocumentoGuia) : undefined
}

const OPCIONES_GUIA: { valor: 'todos' | CodigoDocumentoGuia; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todas las guías' },
  { valor: 'G1', etiqueta: 'G1 — Documento maestro de programa' },
  { valor: 'G2', etiqueta: 'G2 — Respaldo de mejoramiento (programa)' },
  { valor: 'G3', etiqueta: 'G3 — Documento maestro institucional' },
  { valor: 'G4', etiqueta: 'G4 — Respaldo de mejoramiento (institución)' },
]

interface BibliotecaPlantillasContenidoProps {
  rol: 'Administrador' | 'Cargador'
}

export function BibliotecaPlantillasContenido({ rol }: BibliotecaPlantillasContenidoProps) {
  const esAdmin = rol === 'Administrador'
  const { datos, crearPlantilla, actualizarPlantilla, eliminarPlantilla } = usarAlmacen()
  const [busqueda, setBusqueda] = useState('')
  const [tipoTramite, setTipoTramite] = useState<'todos' | 'Renovacion' | 'NuevoPrograma' | 'General'>(
    'todos',
  )
  const [codigoGuia, setCodigoGuia] = useState<'todos' | CodigoDocumentoGuia>('todos')
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [editando, setEditando] = useState<Plantilla | null>(null)
  const [formulario, setFormulario] = useState({
    nombre: '',
    version: '2026.1',
    vigente: true,
    categoria: 'Programa' as Plantilla['categoria'],
    descripcion: '',
    tipoTramite: 'General' as TipoTramitePlantilla,
    codigoGuia: '' as CodigoDocumentoGuia | '',
    esGuiaDocumentoMaestro: false,
  })
  const [archivoPlantilla, setArchivoPlantilla] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)

  const plantillasFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase()
    return datos.plantillas.filter((p) => {
      if (!esAdmin && !p.vigente) return false
      if (tipoTramite !== 'todos' && p.tipoTramite !== tipoTramite) return false
      if (codigoGuia !== 'todos' && p.codigoGuia !== codigoGuia) return false
      return (
        p.nombre.toLowerCase().includes(texto) ||
        p.codigoGuia.toLowerCase().includes(texto) ||
        ETIQUETAS_GUIA[p.codigoGuia]?.toLowerCase().includes(texto) ||
        (p.descripcion?.toLowerCase().includes(texto) ?? false)
      )
    })
  }, [datos.plantillas, busqueda, tipoTramite, codigoGuia, esAdmin])

  const abrirCrear = () => {
    setEditando(null)
    setFormulario({
      nombre: '',
      version: '2026.1',
      vigente: true,
      categoria: 'Programa',
      descripcion: '',
      tipoTramite: 'General',
      codigoGuia: '',
      esGuiaDocumentoMaestro: false,
    })
    setArchivoPlantilla(null)
    setDialogoAbierto(true)
  }

  const abrirEditar = (plantilla: Plantilla) => {
    setEditando(plantilla)
    setFormulario({
      nombre: plantilla.nombre,
      version: plantilla.version,
      vigente: plantilla.vigente,
      categoria: plantilla.categoria,
      descripcion: plantilla.descripcion ?? '',
      tipoTramite: plantilla.tipoTramite ?? 'General',
      codigoGuia: plantilla.codigoGuia ?? '',
      esGuiaDocumentoMaestro: plantilla.esGuiaDocumentoMaestro ?? false,
    })
    setArchivoPlantilla(null)
    setDialogoAbierto(true)
  }

  async function manejarArchivoPlantilla(file: File | null) {
    setArchivoPlantilla(file)
    if (!file) return
    const nombreBase = file.name.replace(/\.docx$/i, '').replace(/[_-]+/g, ' ').trim()
    const guiaInferida = guiaDesdeNombreArchivo(file.name)
    setFormulario((prev) => ({
      ...prev,
      nombre: nombreBase || prev.nombre,
      codigoGuia: guiaInferida ?? prev.codigoGuia,
      esGuiaDocumentoMaestro:
        prev.esGuiaDocumentoMaestro || /documento\s*maestro/i.test(file.name),
    }))
  }

  const guardar = async () => {
    const guiaSeleccionada = formulario.codigoGuia
    if (!formulario.nombre.trim() || !guiaSeleccionada) {
      toast.error('Nombre y guía (G1–G4) son obligatorios.')
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
        formato: 'DOCX' as const,
        descripcion: formulario.descripcion.trim() || undefined,
        codigoGuia: guiaSeleccionada,
      }

      if (editando) {
        if (apiDisponible()) {
          await actualizarPlantillaApi(editando.id, {
            nombre: payload.nombre,
            version: payload.version,
            descripcion: payload.descripcion,
            vigente: payload.vigente,
            tipoTramite: payload.tipoTramite,
            codigoGuia: payload.codigoGuia,
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
        toast.success('Plantilla creada y almacenada.')
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
        <EncabezadoPagina
          etiqueta="Recursos institucionales"
          titulo="Biblioteca de plantillas"
          descripcion="Documentos guía del Decreto 1330 (G1–G4). Elige la guía según tu trámite: programa nuevo (G1), renovación de programa (G1 + G2), condiciones institucionales nuevas (G3) o renovación institucional (G3 + G4)."
        />
        {esAdmin ? (
          <Button onClick={abrirCrear}>
            <Plus className="size-4" />
            Nueva plantilla
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar plantillas…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="max-w-md"
        />
        <select
          value={tipoTramite}
          onChange={(e) =>
            setTipoTramite(e.target.value as typeof tipoTramite)
          }
          className="rounded-lg border border-input px-3 py-2 text-sm"
        >
          <option value="todos">Todos los trámites</option>
          <option value="Renovacion">Renovación</option>
          <option value="NuevoPrograma">Nuevo programa</option>
          <option value="General">General</option>
        </select>
        <select
          value={codigoGuia}
          onChange={(e) => setCodigoGuia(e.target.value as typeof codigoGuia)}
          className="rounded-lg border border-input px-3 py-2 text-sm"
        >
          {OPCIONES_GUIA.map((op) => (
            <option key={op.valor} value={op.valor}>{op.etiqueta}</option>
          ))}
        </select>
      </div>

      <RejillaPlantillas
        plantillas={plantillasFiltradas}
        onEditar={esAdmin ? abrirEditar : undefined}
        onEliminar={
          esAdmin
            ? async (id) => {
                await eliminarPlantilla(id)
                toast.success('Plantilla deshabilitada.')
              }
            : undefined
        }
      />

      {!esAdmin ? (
        <p className="text-sm text-muted-foreground">
          ¿Necesitas corregir un rechazo?{' '}
          <Link href="/cargador/evidencias" className="font-medium text-esmeralda hover:underline">
            Revisa tus evidencias
          </Link>
          .
        </p>
      ) : null}

      {esAdmin ? (
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
                  <Label>Guía (G1–G4)</Label>
                  <Select
                    value={formulario.codigoGuia}
                    onValueChange={(v) =>
                      setFormulario({
                        ...formulario,
                        codigoGuia: v as CodigoDocumentoGuia,
                      })
                    }
                  >
                    <SelectTrigger aria-label="Guía de la plantilla">
                      <SelectValue placeholder="Selecciona la guía" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="G1">G1</SelectItem>
                      <SelectItem value="G2">G2</SelectItem>
                      <SelectItem value="G3">G3</SelectItem>
                      <SelectItem value="G4">G4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="version-plt">Versión</Label>
                <Input
                  id="version-plt"
                  value={formulario.version}
                  onChange={(e) => setFormulario({ ...formulario, version: e.target.value })}
                />
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
      ) : null}
    </div>
  )
}
