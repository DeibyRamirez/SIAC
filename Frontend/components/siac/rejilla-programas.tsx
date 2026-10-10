import Image from 'next/image'

import Link from 'next/link'

import { ArrowRight, MoreHorizontal } from 'lucide-react'



import { Badge } from '@/components/ui/badge'

import { Button } from '@/components/ui/button'

import { Card, CardContent } from '@/components/ui/card'

import {

  DropdownMenu,

  DropdownMenuContent,

  DropdownMenuItem,

  DropdownMenuTrigger,

} from '@/components/ui/dropdown-menu'

import { Progress } from '@/components/ui/progress'

import { Semaforo } from '@/components/siac/insignia-estado'

import type { Programa, SemaforoPrograma } from '@/lib/tipos'

import type { FilaPanelPrograma } from '@/lib/servicios/panel-programas.servicio'

import { clasesBadgeEstadoProceso } from '@/lib/utilidades/etiquetas-semaforo'
import { obtenerInicialesPrograma } from '@/lib/utilidades-siac'
import { cn } from '@/lib/utils'
import { etiquetaDocumentoPanel, formatearFechaResolucion } from '@/lib/utilidades/parametros-panel-url'



export type ProgramaRejilla = Programa | (FilaPanelPrograma & {

  porcentajeAvance: number

  semaforo: SemaforoPrograma

  nivel?: string

  facultad?: string

  activo?: boolean

  urlImagen?: string

  estadoProceso?: string

})



interface RejillaProgramasProps {

  programas: ProgramaRejilla[]

  enlaceEvidencias?: string

  enlaceDetalle?: (id: string) => string

}



export function RejillaProgramas({

  programas,

  enlaceEvidencias,

  enlaceDetalle,

}: RejillaProgramasProps) {

  if (programas.length === 0) {

    return (

      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">

        No hay programas que coincidan con los filtros seleccionados.

      </p>

    )

  }



  return (

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

      {programas.map((programa, indice) => {

        const inactivo = programa.activo === false

        const documentos = 'documentos' in programa ? programa.documentos : undefined



        return (

          <Card

            key={programa.id}

            className={`overflow-hidden ${inactivo ? 'opacity-60' : ''}`}

          >

            <CardContent className="space-y-4 pt-0">

              <div className="relative mx-auto mt-4 aspect-[9/16] w-full max-w-[140px] overflow-hidden rounded-xl bg-accent">

                {programa.urlImagen ? (

                  <Image

                    src={programa.urlImagen}

                    alt={programa.nombre}

                    fill

                    className="object-cover"

                    sizes="140px"

                    priority={indice === 0}

                  />

                ) : (

                  <div className="flex h-full items-center justify-center bg-primary/10 text-xs font-bold text-primary">

                    {obtenerInicialesPrograma(programa.nombre)}

                  </div>

                )}

              </div>



              <div className="flex items-start justify-between px-1">

                <div className="min-w-0 flex-1">

                  <p className="font-semibold text-primary">{programa.nombre}</p>

                  <p className="text-xs text-muted-foreground">

                    {programa.codigo ?? 'Institución'}

                    {programa.nivel ? ` · ${programa.nivel}` : ''}

                    {programa.facultad ? ` · ${programa.facultad}` : ''}

                  </p>

                  {inactivo ? (

                    <Badge variant="destructive" className="mt-1">Inactivo</Badge>

                  ) : null}

                </div>

                <DropdownMenu>

                  <DropdownMenuTrigger

                    render={

                      <Button size="icon" variant="ghost" className="size-8 shrink-0">

                        <MoreHorizontal className="size-4" />

                      </Button>

                    }

                  />

                  <DropdownMenuContent align="end">

                    {enlaceDetalle && (

                      <DropdownMenuItem

                        render={

                          <Link href={enlaceDetalle(programa.id)}>Ver resumen del programa</Link>

                        }

                      />

                    )}

                  </DropdownMenuContent>

                </DropdownMenu>

              </div>



              {documentos && documentos.length > 0 ? (
                <div className="flex flex-wrap gap-1 px-1">
                  {documentos.map((doc) => (
                    <Badge key={doc.codigoGuia} variant="secondary" className="text-[10px]">
                      {etiquetaDocumentoPanel(doc)}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {'fechaResolucion' in programa && 'semestre' in programa ? (
                <dl className="grid grid-cols-2 gap-x-2 px-1 text-xs">
                  <dt className="text-muted-foreground">Resolución MEN</dt>
                  <dd className="text-right font-medium text-primary">
                    {formatearFechaResolucion(programa.fechaResolucion)}
                  </dd>
                  <dt className="text-muted-foreground">Semestre</dt>
                  <dd className="text-right font-medium text-primary">{programa.semestre ?? '—'}</dd>
                </dl>
              ) : null}



              <div className="space-y-2 px-1">

                <div className="flex items-center justify-between text-sm">

                  <span className="text-muted-foreground">Avance acreditación</span>

                  <span className="font-semibold text-esmeralda">{programa.porcentajeAvance}%</span>

                </div>

                <Progress value={programa.porcentajeAvance} className="h-2" />

              </div>



              <div className="flex items-center justify-between px-1 pb-2">

                <div className="flex flex-col gap-1">

                  {'semaforoAvance' in programa && programa.semaforoAvance ? (

                    <div className="flex flex-wrap items-center gap-2">

                      <Semaforo
                        valor={programa.semaforoGeneral ?? programa.semaforo}
                        contexto="avancePrograma"
                        etiqueta="General"
                      />

                      <Semaforo valor={programa.semaforoAvance} contexto="avancePrograma" etiqueta="Avance" />

                      <Semaforo
                        valor={programa.semaforoVigencia!}
                        contexto="vigenciaRegistro"
                        etiqueta="Vigencia"
                      />

                    </div>

                  ) : (

                    <Semaforo valor={programa.semaforo} contexto="avancePrograma" />

                  )}

                  {programa.estadoProceso ? (
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                        clasesBadgeEstadoProceso(
                          'anexoInfraestructuraVencido' in programa &&
                            Boolean(programa.anexoInfraestructuraVencido),
                          'avancePorcentual' in programa
                            ? programa.avancePorcentual
                            : programa.porcentajeAvance,
                        ),
                      )}
                    >
                      {programa.estadoProceso}
                    </span>
                  ) : null}

                </div>

                {enlaceDetalle ? (

                  <Link href={enlaceDetalle(programa.id)}>

                    <Button size="sm" variant="ghost" className="h-8 gap-1 text-cyan-tecnico">

                      Ver resumen

                      <ArrowRight className="size-3" />

                    </Button>

                  </Link>

                ) : enlaceEvidencias ? (

                  <Link href={enlaceEvidencias}>

                    <Button size="sm" variant="ghost" className="h-8 gap-1 text-cyan-tecnico">

                      Evidencias

                      <ArrowRight className="size-3" />

                    </Button>

                  </Link>

                ) : null}

              </div>

            </CardContent>

          </Card>

        )

      })}

    </div>

  )

}


