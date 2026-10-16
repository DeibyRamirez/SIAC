'use client'

import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight, Download, FileText } from 'lucide-react'
import { toast } from 'sonner'

import { BarraVigenciaRegistro } from '@/components/siac/barra-vigencia-registro'
import { CeldaSemaforoVigencia } from '@/components/siac/celda-semaforo-vigencia'
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
import { obtenerUrlDescargaApi } from '@/lib/servicios/evidencias.servicio'
import type { PaqueteVigenciaRegistro, SemaforoVigencia } from '@/lib/tipos'
import { cn } from '@/lib/utils'
import { formatearFecha } from '@/lib/utilidades-siac'

function semaforoAEstadoAnexo(semaforo: SemaforoVigencia): 'Vigente' | 'Proximo' | 'Vencido' {
  if (semaforo === 'Amarillo') return 'Proximo'
  if (semaforo === 'Rojo' || semaforo === 'Vencido') return 'Vencido'
  return 'Vigente'
}

interface PanelPaquetesVigenciaRegistroProps {
  paquetes: PaqueteVigenciaRegistro[]
  programaIdFiltro?: string | null
}

export function PanelPaquetesVigenciaRegistro({
  paquetes,
  programaIdFiltro,
}: PanelPaquetesVigenciaRegistroProps) {
  const [expandidos, setExpandidos] = useState<Set<string>>(() => new Set())

  const lista =
    programaIdFiltro
      ? paquetes.filter((p) => p.entidadId === programaIdFiltro)
      : paquetes

  const resumen = {
    Vigente: lista.filter((p) => p.semaforoVigencia === 'Verde').length,
    Proximo: lista.filter((p) => p.semaforoVigencia === 'Amarillo').length,
    Vencido: lista.filter(
      (p) => p.semaforoVigencia === 'Rojo' || p.semaforoVigencia === 'Vencido',
    ).length,
  }

  const estilosTarjeta: Record<'Vigente' | 'Proximo' | 'Vencido', string> = {
    Vigente: 'border-l-esmeralda',
    Proximo: 'border-l-ocre',
    Vencido: 'border-l-fucsia',
  }

  function alternar(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function descargarEvidencia(evidenciaId: string) {
    try {
      const { url } = await obtenerUrlDescargaApi(evidenciaId)
      window.open(url, '_blank')
    } catch {
      toast.error('No se pudo obtener la URL de descarga.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {(['Vigente', 'Proximo', 'Vencido'] as const).map((estado) => (
          <Card key={estado} className={cn('border-l-4', estilosTarjeta[estado])}>
            <CardContent className="pt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {estado === 'Proximo' ? 'Próximo' : estado}
              </p>
              <p className="mt-2 text-3xl font-semibold text-primary">{resumen[estado]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-primary/10 bg-white/60">
          <CardTitle>Paquetes de registro calificado</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 pl-6" />
                  <TableHead className="min-w-[200px]">Programa / institución</TableHead>
                  <TableHead className="min-w-[180px]">Semáforo de vigencia</TableHead>
                  <TableHead className="min-w-[140px]">Resolución</TableHead>
                  <TableHead className="min-w-[140px]">Fin de vigencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      No hay programas con resolución MEN registrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  lista.map((paquete) => {
                    const abierto = expandidos.has(paquete.entidadId)
                    const estado = semaforoAEstadoAnexo(paquete.semaforoVigencia)
                    return (
                      <Fragment key={paquete.entidadId}>
                        <TableRow className="align-top">
                          <TableCell className="pl-6 py-4">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => alternar(paquete.entidadId)}
                              aria-expanded={abierto}
                              aria-label={abierto ? 'Contraer paquete' : 'Expandir paquete'}
                            >
                              {abierto ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="py-4">
                            <p className="font-medium text-primary">[{paquete.nombre}]</p>
                            <p className="text-xs text-muted-foreground">
                              {paquete.codigo} · {paquete.alcance === 'Institucion' ? 'Institución' : 'Programa'}
                            </p>
                          </TableCell>
                          <TableCell className="py-4">
                            <CeldaSemaforoVigencia
                              estado={estado}
                              porcentaje={paquete.porcentajeVigencia}
                            />
                          </TableCell>
                          <TableCell className="whitespace-nowrap py-4 text-sm">
                            {formatearFecha(paquete.fechaResolucion.slice(0, 10))}
                          </TableCell>
                          <TableCell className="whitespace-nowrap py-4 text-sm">
                            {formatearFecha(paquete.fechaFinVigencia.slice(0, 10))}
                          </TableCell>
                        </TableRow>
                        {abierto ? (
                          <TableRow>
                            <TableCell colSpan={5} className="bg-muted/30 px-6 py-4">
                              <div className="space-y-4">
                                <BarraVigenciaRegistro
                                  fechaResolucion={paquete.fechaResolucion}
                                  nombreEntidad={paquete.nombre}
                                />
                                <ul className="space-y-2">
                                  {paquete.documentos.map((doc) => (
                                    <li
                                      key={doc.evidenciaId}
                                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/10 bg-background px-3 py-2 text-sm"
                                    >
                                      <div className="flex min-w-0 items-start gap-2">
                                        <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                                        <div>
                                          <p className="font-medium text-primary">
                                            {doc.codigoGuia ? `${doc.codigoGuia} · ` : ''}
                                            {doc.nombre}
                                          </p>
                                          {doc.nombreArchivo ? (
                                            <p className="text-xs text-muted-foreground">{doc.nombreArchivo}</p>
                                          ) : null}
                                        </div>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => descargarEvidencia(doc.evidenciaId)}
                                      >
                                        <Download className="size-4" />
                                        Ver documento
                                      </Button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
