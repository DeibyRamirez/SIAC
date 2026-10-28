'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Bell } from 'lucide-react'
import { toast } from 'sonner'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { CeldaSemaforoVigencia } from '@/components/siac/celda-semaforo-vigencia'
import { MensajeCargando, MensajeErrorCarga } from '@/components/siac/estado-carga-lista'
import { PanelPaquetesVigenciaRegistro } from '@/components/siac/panel-paquetes-vigencia-registro'
import { TarjetaUmbralesSemaforo } from '@/components/siac/tarjeta-umbrales-semaforo'
import { ControlesPaginacion } from '@/components/siac/controles-paginacion'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  listarProgramasApi,
  listarVigenciasApi,
  obtenerUrlDescargaVigenciaApi,
} from '@/lib/servicios/programas.servicio'
import { listarPaquetesRegistroVigenciaApi } from '@/lib/servicios/vigencias.servicio'
import type {
  AnexoVigencia,
  EstadoVigencia,
  PaqueteVigenciaRegistro,
  Programa,
} from '@/lib/tipos'
import { cn } from '@/lib/utils'
import { paginarArreglo } from '@/lib/utilidades/paginacion-cliente'
import {
  formatearFecha,
  obtenerNombrePrograma,
} from '@/lib/utilidades-siac'

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
  const [cargandoAnexos, setCargandoAnexos] = useState(true)
  const [errorAnexos, setErrorAnexos] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)
  const [programas, setProgramas] = useState<Programa[]>([])
  const [paquetes, setPaquetes] = useState<PaqueteVigenciaRegistro[]>([])
  const programaIdUrl = searchParams.get('programaId')

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

  const cargarPaquetes = useCallback(async () => {
    if (!apiDisponible()) {
      setPaquetes([])
      return
    }
    try {
      const lista = await listarPaquetesRegistroVigenciaApi(programaIdUrl ?? undefined)
      setPaquetes(lista)
    } catch (err) {
      setPaquetes([])
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los paquetes de vigencia.')
    }
  }, [programaIdUrl])

  const cargarAnexos = useCallback(async () => {
    if (!apiDisponible()) {
      setAnexos(datos.anexosVigencia)
      setCargandoAnexos(false)
      return
    }
    setCargandoAnexos(true)
    setErrorAnexos(null)
    try {
      const programaId = programaIdUrl ?? undefined
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
    } catch (err) {
      setAnexos([])
      setErrorAnexos(
        err instanceof Error && err.message
          ? `No se pudieron cargar las vigencias: ${err.message}`
          : 'No se pudieron cargar las vigencias.',
      )
    } finally {
      setCargandoAnexos(false)
    }
  }, [datos.anexosVigencia, programaIdUrl])

  useEffect(() => {
    cargarPaquetes()
    cargarAnexos()
    async function cargarProgramas() {
      if (!apiDisponible()) return
      try {
        const lista = await listarProgramasApi()
        setProgramas(lista)
      } catch {
        setProgramas([])
      }
    }
    cargarProgramas()
  }, [cargarAnexos, cargarPaquetes, searchParams])



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

      <PanelPaquetesVigenciaRegistro paquetes={paquetes} programaIdFiltro={programaIdUrl} />

      <TarjetaUmbralesSemaforo />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-primary">Certificados y anexos</h2>
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
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-primary/10 bg-white/60">
          <CardTitle>Anexos con fecha de vencimiento</CardTitle>
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
                {anexos.length === 0 && cargandoAnexos ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-4">
                      <MensajeCargando texto="Cargando vigencias…" />
                    </TableCell>
                  </TableRow>
                ) : anexos.length === 0 && errorAnexos ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-4">
                      <MensajeErrorCarga
                        mensaje={errorAnexos}
                        onReintentar={() => void cargarAnexos()}
                      />
                    </TableCell>
                  </TableRow>
                ) : anexos.length === 0 ? (
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
                        {obtenerNombrePrograma(anexo.programaId, programas)}
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

    </div>
  )
}
