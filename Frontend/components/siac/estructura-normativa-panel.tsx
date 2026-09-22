'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, FolderOpen, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import type {
  CarpetaNormativa,
  DocumentoRequerido,
  EtapaAcreditacion,
  TipoEtapaAcreditacion,
} from '@/lib/tipos'

type TipoSeleccion = 'etapa' | 'carpeta' | 'documento'

interface Seleccion {
  tipo: TipoSeleccion
  id: string
}

export function EstructuraNormativaPanel() {
  const {
    datos,
    crearEtapa,
    actualizarEtapa,
    eliminarEtapa,
    crearCarpeta,
    actualizarCarpeta,
    eliminarCarpeta,
    crearDocumentoRequerido,
    actualizarDocumentoRequerido,
    eliminarDocumentoRequerido,
  } = usarAlmacen()

  const [expandidas, setExpandidas] = useState<Set<string>>(new Set(['etapa-pre', 'etapa-rad']))
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null)
  const [dialogoTipo, setDialogoTipo] = useState<TipoSeleccion | null>(null)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)

  const [formEtapa, setFormEtapa] = useState({
    nombre: '',
    tipo: 'PreRadicacion' as TipoEtapaAcreditacion,
    descripcion: '',
    orden: 1,
    activa: true,
  })
  const [formCarpeta, setFormCarpeta] = useState({
    etapaId: '',
    condicionId: '',
    nombre: '',
    descripcion: '',
    orden: 1,
    activa: true,
  })
  const [formDocumento, setFormDocumento] = useState({
    carpetaId: '',
    nombre: '',
    esPlantilla: true,
    formato: 'DOCX' as DocumentoRequerido['formato'],
    obligatorio: true,
    orden: 1,
  })

  const etapasOrdenadas = useMemo(
    () => [...datos.etapas].sort((a, b) => a.orden - b.orden),
    [datos.etapas],
  )

  const condicionesInstitucionales = datos.condiciones.filter((c) => c.tipo === 'Institucional')
  const condicionesPrograma = datos.condiciones.filter((c) => c.tipo === 'Programa')

  const alternarExpandida = (id: string) => {
    setExpandidas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const abrirDialogo = (tipo: TipoSeleccion, padreId?: string) => {
    setDialogoTipo(tipo)
    if (tipo === 'etapa') {
      setFormEtapa({
        nombre: '',
        tipo: 'PreRadicacion',
        descripcion: '',
        orden: datos.etapas.length + 1,
        activa: true,
      })
    } else if (tipo === 'carpeta') {
      setFormCarpeta({
        etapaId: padreId ?? datos.etapas[0]?.id ?? '',
        condicionId: '',
        nombre: '',
        descripcion: '',
        orden: 1,
        activa: true,
      })
    } else {
      setFormDocumento({
        carpetaId: padreId ?? datos.carpetas[0]?.id ?? '',
        nombre: '',
        esPlantilla: true,
        formato: 'DOCX',
        obligatorio: true,
        orden: 1,
      })
    }
    setDialogoAbierto(true)
  }

  const guardarDialogo = () => {
    if (dialogoTipo === 'etapa') {
      if (!formEtapa.nombre) {
        toast.error('El nombre de la etapa es obligatorio.')
        return
      }
      crearEtapa(formEtapa)
      toast.success('Etapa creada.')
    } else if (dialogoTipo === 'carpeta') {
      if (!formCarpeta.nombre || !formCarpeta.etapaId) {
        toast.error('Complete nombre y etapa.')
        return
      }
      crearCarpeta(formCarpeta)
      toast.success('Carpeta creada.')
    } else if (dialogoTipo === 'documento') {
      if (!formDocumento.nombre || !formDocumento.carpetaId) {
        toast.error('Complete nombre y carpeta.')
        return
      }
      crearDocumentoRequerido(formDocumento)
      toast.success('Documento requerido registrado.')
    }
    setDialogoAbierto(false)
  }

  const itemSeleccionado = useMemo(() => {
    if (!seleccion) return null
    if (seleccion.tipo === 'etapa') return datos.etapas.find((e) => e.id === seleccion.id)
    if (seleccion.tipo === 'carpeta') return datos.carpetas.find((c) => c.id === seleccion.id)
    return datos.documentosRequeridos.find((d) => d.id === seleccion.id)
  }, [seleccion, datos])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <EncabezadoPagina
          etiqueta="Decreto 1330 de 2019"
          titulo="Estructura normativa"
          descripcion="Configure etapas, carpetas y documentos requeridos para el proceso de acreditación."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => abrirDialogo('etapa')}>
            <Plus className="size-4" />
            Nueva etapa
          </Button>
          <Button variant="outline" size="sm" onClick={() => abrirDialogo('carpeta')}>
            <Plus className="size-4" />
            Nueva carpeta
          </Button>
          <Button size="sm" onClick={() => abrirDialogo('documento')}>
            <Plus className="size-4" />
            Nuevo documento
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{condicionesInstitucionales.length} CI</Badge>
        <Badge variant="secondary">{condicionesPrograma.length} CP</Badge>
        <Badge variant="secondary">{datos.etapas.length} etapas</Badge>
        <Badge variant="secondary">{datos.carpetas.length} carpetas</Badge>
        <Badge variant="secondary">{datos.documentosRequeridos.length} documentos</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Árbol normativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {etapasOrdenadas.map((etapa) => {
              const carpetas = datos.carpetas
                .filter((c) => c.etapaId === etapa.id)
                .sort((a, b) => a.orden - b.orden)
              const expandida = expandidas.has(etapa.id)

              return (
                <div key={etapa.id}>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => alternarExpandida(etapa.id)}
                      className="rounded p-1 hover:bg-muted"
                    >
                      {expandida ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeleccion({ tipo: 'etapa', id: etapa.id })}
                      className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted ${
                        seleccion?.id === etapa.id ? 'bg-accent font-medium' : ''
                      }`}
                    >
                      <FolderOpen className="size-4 text-esmeralda" />
                      {etapa.nombre}
                    </button>
                  </div>
                  {expandida &&
                    carpetas.map((carpeta) => {
                      const documentos = datos.documentosRequeridos
                        .filter((d) => d.carpetaId === carpeta.id)
                        .sort((a, b) => a.orden - b.orden)
                      return (
                        <div key={carpeta.id} className="ml-6 border-l border-border pl-3">
                          <button
                            type="button"
                            onClick={() => setSeleccion({ tipo: 'carpeta', id: carpeta.id })}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted ${
                              seleccion?.id === carpeta.id ? 'bg-accent font-medium' : ''
                            }`}
                          >
                            <FolderOpen className="size-3.5 text-muted-foreground" />
                            {carpeta.nombre}
                          </button>
                          {documentos.map((doc) => (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => setSeleccion({ tipo: 'documento', id: doc.id })}
                              className={`ml-4 flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs hover:bg-muted ${
                                seleccion?.id === doc.id ? 'bg-accent font-medium' : ''
                              }`}
                            >
                              <FileText className="size-3 text-muted-foreground" />
                              {doc.nombre}
                            </button>
                          ))}
                        </div>
                      )
                    })}
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalle y acciones</CardTitle>
          </CardHeader>
          <CardContent>
            {!itemSeleccionado || !seleccion ? (
              <p className="text-sm text-muted-foreground">
                Seleccione una etapa, carpeta o documento del árbol para ver detalles y editar.
              </p>
            ) : (
              <DetalleSeleccion
                key={seleccion.id}
                seleccion={seleccion}
                item={itemSeleccionado}
                onActualizarEtapa={actualizarEtapa}
                onEliminarEtapa={eliminarEtapa}
                onActualizarCarpeta={actualizarCarpeta}
                onEliminarCarpeta={eliminarCarpeta}
                onActualizarDocumento={actualizarDocumentoRequerido}
                onEliminarDocumento={eliminarDocumentoRequerido}
                onLimpiarSeleccion={() => setSeleccion(null)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogoTipo === 'etapa' && 'Nueva etapa'}
              {dialogoTipo === 'carpeta' && 'Nueva carpeta'}
              {dialogoTipo === 'documento' && 'Nuevo documento requerido'}
            </DialogTitle>
          </DialogHeader>
          {dialogoTipo === 'etapa' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={formEtapa.nombre}
                  onChange={(e) => setFormEtapa({ ...formEtapa, nombre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formEtapa.tipo}
                  onValueChange={(v) =>
                    setFormEtapa({ ...formEtapa, tipo: v as TipoEtapaAcreditacion })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PreRadicacion">Pre-radicación</SelectItem>
                    <SelectItem value="Radicacion">Radicación</SelectItem>
                    <SelectItem value="Autoevaluacion">Autoevaluación</SelectItem>
                    <SelectItem value="Renovacion">Renovación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formEtapa.descripcion}
                  onChange={(e) => setFormEtapa({ ...formEtapa, descripcion: e.target.value })}
                />
              </div>
            </div>
          )}
          {dialogoTipo === 'carpeta' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Etapa</Label>
                <Select
                  value={formCarpeta.etapaId}
                  onValueChange={(v) => {
                    if (v != null) setFormCarpeta({ ...formCarpeta, etapaId: v })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {datos.etapas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nombre de carpeta</Label>
                <Input
                  value={formCarpeta.nombre}
                  onChange={(e) => setFormCarpeta({ ...formCarpeta, nombre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Condición Decreto 1330 (opcional)</Label>
                <Select
                  value={formCarpeta.condicionId || 'ninguna'}
                  onValueChange={(v) => {
                    if (v != null) {
                      setFormCarpeta({ ...formCarpeta, condicionId: v === 'ninguna' ? '' : v })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguna">Sin condición</SelectItem>
                    {datos.condiciones.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.tipo} {c.numero}: {c.nombre.slice(0, 40)}…
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formCarpeta.descripcion}
                  onChange={(e) => setFormCarpeta({ ...formCarpeta, descripcion: e.target.value })}
                />
              </div>
            </div>
          )}
          {dialogoTipo === 'documento' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Carpeta</Label>
                <Select
                  value={formDocumento.carpetaId}
                  onValueChange={(v) => {
                    if (v != null) setFormDocumento({ ...formDocumento, carpetaId: v })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {datos.carpetas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nombre del documento</Label>
                <Input
                  value={formDocumento.nombre}
                  onChange={(e) => setFormDocumento({ ...formDocumento, nombre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Formato</Label>
                <Select
                  value={formDocumento.formato}
                  onValueChange={(v) =>
                    setFormDocumento({
                      ...formDocumento,
                      formato: v as DocumentoRequerido['formato'],
                    })
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarDialogo}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetalleSeleccion({
  seleccion,
  item,
  onActualizarEtapa,
  onEliminarEtapa,
  onActualizarCarpeta,
  onEliminarCarpeta,
  onActualizarDocumento,
  onEliminarDocumento,
  onLimpiarSeleccion,
}: {
  seleccion: Seleccion
  item: EtapaAcreditacion | CarpetaNormativa | DocumentoRequerido
  onActualizarEtapa: (id: string, cambios: Partial<EtapaAcreditacion>) => void
  onEliminarEtapa: (id: string) => void
  onActualizarCarpeta: (id: string, cambios: Partial<CarpetaNormativa>) => void
  onEliminarCarpeta: (id: string) => void
  onActualizarDocumento: (id: string, cambios: Partial<DocumentoRequerido>) => void
  onEliminarDocumento: (id: string) => void
  onLimpiarSeleccion: () => void
}) {
  const [nombre, setNombre] = useState('nombre' in item ? item.nombre : '')

  const guardar = () => {
    if (seleccion.tipo === 'etapa') {
      onActualizarEtapa(seleccion.id, { nombre })
      toast.success('Etapa actualizada.')
    } else if (seleccion.tipo === 'carpeta') {
      onActualizarCarpeta(seleccion.id, { nombre })
      toast.success('Carpeta actualizada.')
    } else {
      onActualizarDocumento(seleccion.id, { nombre })
      toast.success('Documento actualizado.')
    }
  }

  const eliminar = () => {
    if (seleccion.tipo === 'etapa') onEliminarEtapa(seleccion.id)
    else if (seleccion.tipo === 'carpeta') onEliminarCarpeta(seleccion.id)
    else onEliminarDocumento(seleccion.id)
    toast.success('Elemento eliminado.')
    onLimpiarSeleccion()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nombre</Label>
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      {'descripcion' in item && item.descripcion && (
        <p className="text-sm text-muted-foreground">{item.descripcion}</p>
      )}
      {'tipo' in item && 'orden' in item && !('carpetaId' in item) && !('etapaId' in item) && (
        <p className="text-xs text-muted-foreground">Tipo: {(item as EtapaAcreditacion).tipo}</p>
      )}
      <div className="flex gap-2">
        <Button onClick={guardar}>Guardar cambios</Button>
        <Button variant="destructive" onClick={eliminar}>
          <Trash2 className="size-4" />
          Eliminar
        </Button>
      </div>
    </div>
  )
}
