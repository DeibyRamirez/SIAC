'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Bell, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { CeldaSemaforoVigencia } from '@/components/siac/celda-semaforo-vigencia'
import { ControlesPaginacion } from '@/components/siac/controles-paginacion'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LIMITE_FILAS_TABLA } from '@/lib/constantes/paginacion'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  crearVigenciaConArchivoApi,
  listarProgramasApi,
  listarVigenciasApi,
  obtenerUrlDescargaVigenciaApi,
} from '@/lib/servicios/programas.servicio'
import type { AnexoVigencia, EstadoVigencia, Programa } from '@/lib/tipos'
import { cn } from '@/lib/utils'
import { paginarArreglo } from '@/lib/utilidades/paginacion-cliente'
import { formatearFecha, manejarCambioSelect, obtenerNombrePrograma } from '@/lib/utilidades-siac'

const estilosTarjetaResumen: Record<EstadoVigencia, string> = {
  Vigente: 'border-l-esmeralda',
  Proximo: 'border-l-ocre',
  Vencido: 'border-l-fucsia',
}

export default function VigenciasPage() {
  return (
    <PlantillaPaginaApp titulo="Vigencias y alertas" rol="Administrador">
      <ContenidoVigencias />
    </PlantillaPaginaApp>
  )
}

function ContenidoVigencias() {
  const searchParams = useSearchParams()
  const { datos } = usarAlmacen()
  const [anexos, setAnexos] = useState<AnexoVigencia[]>([])
  const [pagina, setPagina] = useState(1)
  const [programas, setProgramas] = useState<Programa[]>([])
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [formulario, setFormulario] = useState({
    titulo: '',
    programaId: '',
    tipo: 'Documento institucional',
    carpeta: 'permisos',
    aniosVigencia: '7',
    responsable: '',
  })

  const alertasPendientes = useMemo(
    () => datos.alertas.filter((alerta) => !alerta.leida).length,
    [datos.alertas],
  )

  const anexosPagina = useMemo(
    () => paginarArreglo(anexos, pagina, LIMITE_FILAS_TABLA),
    [anexos, pagina],
  )

  useEffect(() => {
    setPagina(1)
  }, [anexos.length])

  const cargarAnexos = useCallback(async () => {
    if (!apiDisponible()) {
      setAnexos(datos.anexosVigencia)
      return
    }
    try {
      const programaId = searchParams.get('programaId') ?? undefined
      const lista = (await listarVigenciasApi(programaId)) as AnexoVigencia[]
      setAnexos(
        lista.map((a) => ({
          ...a,
          fechaVencimiento:
            typeof a.fechaVencimiento === 'string'
              ? a.fechaVencimiento.slice(0, 10)
              : a.fechaVencimiento,
          fechaCarga:
            typeof a.fechaCarga === 'string' ? a.fechaCarga.slice(0, 10) : a.fechaCarga,
        })),
      )
    } catch {
      setAnexos(datos.anexosVigencia)
    }
  }, [datos.anexosVigencia, searchParams])

  useEffect(() => {
    cargarAnexos()
    async function cargarProgramas() {
      if (!apiDisponible()) return
      try {
        const lista = await listarProgramasApi()
        setProgramas(lista)
        if (lista[0]) {
          setFormulario((prev) => ({
            ...prev,
            programaId: searchParams.get('programaId') ?? lista[0].id,
          }))
        }
      } catch {
        setProgramas([])
      }
    }
    cargarProgramas()
  }, [cargarAnexos, searchParams])

  async function guardarAnexo() {
    if (!formulario.titulo || !archivo || !formulario.responsable) {
      toast.error('Complete título, archivo y responsable.')
      return
    }
    setGuardando(true)
    try {
      const formData = new FormData()
      formData.append('titulo', formulario.titulo)
      formData.append('programaId', formulario.programaId)
      formData.append('tipo', formulario.tipo)
      formData.append('carpeta', formulario.carpeta)
      formData.append('aniosVigencia', formulario.aniosVigencia)
      formData.append('responsable', formulario.responsable)
      formData.append('archivo', archivo)

      if (apiDisponible()) {
        await crearVigenciaConArchivoApi(formData)
        await cargarAnexos()
        toast.success('Documento cargado en bucket Documentos.')
      } else {
        toast.error('API no disponible.')
      }
      setDialogoAbierto(false)
      setArchivo(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el documento.')
    } finally {
      setGuardando(false)
    }
  }

  async function descargarAnexo(id: string) {
    try {
      const { url } = await obtenerUrlDescargaVigenciaApi(id)
      window.open(url, '_blank')
    } catch {
      toast.error('No se pudo obtener la URL de descarga.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <EncabezadoPagina
          etiqueta="Control de vigencias"
          titulo="Vigencias y alertas"
          descripcion="Semáforo por documento según fecha de vencimiento. Las alertas in-app se gestionan desde la campana superior."
        />
        <Button onClick={() => setDialogoAbierto(true)}>
          <Plus className="size-4" />
          Cargar documento
        </Button>
      </div>

      {alertasPendientes > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-coral/25 bg-coral/5 px-4 py-3 text-sm text-primary">
          <Bell className="size-4 shrink-0 text-coral" aria-hidden />
          <p>
            Tienes <strong>{alertasPendientes}</strong>{' '}
            {alertasPendientes === 1 ? 'alerta pendiente' : 'alertas pendientes'}. Ábrelas desde
            la campana en la barra superior; aquí el foco es el semáforo de vigencias.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {(['Vigente', 'Proximo', 'Vencido'] as const).map((estado) => {
          const total = anexos.filter((anexo) => anexo.estado === estado).length
          return (
            <Card
              key={estado}
              className={cn('border-l-4', estilosTarjetaResumen[estado])}
            >
              <CardContent className="pt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {estado === 'Proximo' ? 'Próximo' : estado}
                </p>
                <p className="mt-2 text-3xl font-semibold text-primary">{total}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-primary/10 bg-white/60">
          <CardTitle>Control de vigencias</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[220px] pl-6">Semáforo</TableHead>
                  <TableHead className="min-w-[200px]">Documento</TableHead>
                  <TableHead className="min-w-[160px]">Programa</TableHead>
                  <TableHead className="whitespace-nowrap">Vence</TableHead>
                  <TableHead className="pr-6 text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {anexos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      No hay documentos con vigencia registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  anexosPagina.map((anexo) => (
                    <TableRow key={anexo.id} className="align-top">
                      <TableCell className="pl-6 py-4">
                        <CeldaSemaforoVigencia
                          estado={anexo.estado}
                          porcentaje={anexo.porcentajeTranscurrido ?? 0}
                        />
                      </TableCell>
                      <TableCell className="py-4">
                        <p className="font-medium text-primary">{anexo.titulo}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {anexo.carpeta ?? 'general'}
                          {anexo.nombreArchivo ? ` · ${anexo.nombreArchivo}` : ''}
                        </p>
                      </TableCell>
                      <TableCell className="py-4 text-sm">
                        {obtenerNombrePrograma(anexo.programaId)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-4 text-sm">
                        {formatearFecha(anexo.fechaVencimiento)}
                      </TableCell>
                      <TableCell className="pr-6 py-4 text-right">
                        {anexo.nombreArchivo && (
                          <Button variant="outline" size="sm" onClick={() => descargarAnexo(anexo.id)}>
                            Ver documento
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {anexos.length > 0 && (
        <ControlesPaginacion
          pagina={pagina}
          limite={LIMITE_FILAS_TABLA}
          total={anexos.length}
          onCambiarPagina={setPagina}
        />
      )}

      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cargar documento con vigencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título del documento</Label>
              <Input
                id="titulo"
                value={formulario.titulo}
                onChange={(e) => setFormulario({ ...formulario, titulo: e.target.value })}
                placeholder="Ej. Certificado de bomberos"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carpeta">Carpeta interna</Label>
              <Input
                id="carpeta"
                value={formulario.carpeta}
                onChange={(e) => setFormulario({ ...formulario, carpeta: e.target.value })}
                placeholder="permisos, certificados-bomberos…"
              />
            </div>
            <div className="space-y-2">
              <Label>Programa (opcional institucional)</Label>
              <Select
                value={formulario.programaId}
                onValueChange={manejarCambioSelect((v) =>
                  setFormulario({ ...formulario, programaId: v }),
                )}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {programas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="anios">Años de vigencia</Label>
              <Input
                id="anios"
                type="number"
                min={1}
                max={30}
                value={formulario.aniosVigencia}
                onChange={(e) =>
                  setFormulario({ ...formulario, aniosVigencia: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsable">Responsable</Label>
              <Input
                id="responsable"
                value={formulario.responsable}
                onChange={(e) => setFormulario({ ...formulario, responsable: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="archivo">Archivo PDF/DOCX</Label>
              <Input
                id="archivo"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarAnexo} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar documento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
