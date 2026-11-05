'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MoreHorizontal } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Semaforo } from '@/components/siac/insignia-estado'
import type { Programa, SemaforoPrograma } from '@/lib/tipos'
import type { FilaPanelPrograma } from '@/lib/servicios/panel-programas.servicio'
import { clasesBadgeEstadoProceso } from '@/lib/utilidades/etiquetas-semaforo'
import { obtenerInicialesPrograma } from '@/lib/utilidades-siac'
import { cn } from '@/lib/utils'
import { etiquetaDocumentoPanel, formatearFechaResolucion } from '@/lib/utilidades/parametros-panel-url'

export type ProgramaRejilla = (Programa & {
  porcentajeAvance: number
  semaforo: SemaforoPrograma
  estadoProceso?: string
}) | (Omit<FilaPanelPrograma, 'urlImagen'> & {
  porcentajeAvance: number
  semaforo: SemaforoPrograma
  urlImagen?: string | null
  estadoProceso?: string
})

function esFilaPanel(programa: ProgramaRejilla): programa is Omit<FilaPanelPrograma, 'urlImagen'> & {
  urlImagen?: string | null
} & ProgramaRejilla {
  return 'documentos' in programa
}

function tituloPrograma(programa: ProgramaRejilla): string {
  if ('tituloCatalogo' in programa && programa.tituloCatalogo) return programa.tituloCatalogo
  return programa.nombre
}

function codigoSniesPrograma(programa: ProgramaRejilla): string | undefined {
  if ('codigoSnies' in programa && programa.codigoSnies) return programa.codigoSnies
  return undefined
}

const PLACEHOLDER_PROGRAMA = '/imagenes/siac/placeholder-programa.svg'

/** CTA tarjeta: fondo claro (legible); hover cyan con texto blanco. */
const clasesBotonAccionTarjeta = cn(
  buttonVariants({ size: 'sm' }),
  'h-8 gap-1.5 px-3 font-semibold',
  'border border-primary/20 bg-secondary text-secondary-foreground shadow-sm',
  'hover:border-cyan-tecnico hover:bg-cyan-tecnico hover:text-white hover:shadow-md',
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'active:scale-[0.98] motion-reduce:active:scale-100',
  '[&_svg]:transition-transform hover:[&_svg]:translate-x-0.5 motion-reduce:hover:[&_svg]:translate-x-0',
)

interface RejillaProgramasProps {
  programas: ProgramaRejilla[]
  enlaceEvidencias?: string
  enlaceDetalle?: (id: string) => string
  cargando?: boolean
}

function formatearFechaCatalogo(fecha?: string | null): string {
  if (!fecha?.trim()) return '—'
  const iso = fecha.includes('T') ? fecha : `${fecha}T00:00:00.000Z`
  return formatearFechaResolucion(iso)
}

function ImagenPrograma({
  url,
  titulo,
  prioridad,
}: {
  url?: string
  titulo: string
  prioridad?: boolean
}) {
  const [fallo, setFallo] = useState(false)
  const src = !url || fallo ? PLACEHOLDER_PROGRAMA : url

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-accent ring-1 ring-border/60">
      <Image
        src={src}
        alt=""
        fill
        className={cn('object-cover', src === PLACEHOLDER_PROGRAMA && 'object-contain p-4')}
        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
        priority={prioridad}
        onError={() => setFallo(true)}
      />
      <span className="sr-only">{titulo}</span>
    </div>
  )
}

export function RejillaProgramas({
  programas,
  enlaceEvidencias,
  enlaceDetalle,
  cargando = false,
}: RejillaProgramasProps) {
  if (cargando) {
    return (
      <div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-busy="true"
        aria-label="Cargando programas"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (programas.length === 0) {
    return (
      <p
        className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"
        role="status"
      >
        No hay programas que coincidan con los filtros seleccionados.
      </p>
    )
  }

  return (
    <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3" aria-label="Programas académicos">
      {programas.map((programa, indice) => {
        const inactivo = programa.activo === false
        const titulo = tituloPrograma(programa)
        const codigoSnies = codigoSniesPrograma(programa)
        const documentos = esFilaPanel(programa) ? programa.documentos : undefined

        return (
          <li key={programa.id}>
            <Card
              className={cn(
                'flex h-full flex-col overflow-hidden border-border/80 shadow-sm transition-shadow hover:shadow-md',
                inactivo && 'opacity-65',
              )}
            >
              <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-4">
                <ImagenPrograma
                  url={programa.urlImagen ?? undefined}
                  titulo={titulo}
                  prioridad={indice === 0}
                />

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h3 className="text-base font-bold leading-snug text-primary">{titulo}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {codigoSnies ? (
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          SNIES {codigoSnies}
                        </Badge>
                      ) : programa.codigo ? (
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {programa.codigo}
                        </Badge>
                      ) : null}
                      {programa.nivel ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {programa.nivel}
                        </Badge>
                      ) : null}
                      {programa.modalidad ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {programa.modalidad}
                        </Badge>
                      ) : null}
                    </div>
                    {programa.facultad ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{programa.facultad}</p>
                    ) : null}
                    {inactivo ? <Badge variant="destructive">Inactivo</Badge> : null}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 shrink-0"
                          aria-label={`Acciones de ${titulo}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      {enlaceDetalle ? (
                        <DropdownMenuItem
                          render={
                            <Link href={enlaceDetalle(programa.id)}>Ver resumen del programa</Link>
                          }
                        />
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {'duracion' in programa && (programa.duracion || programa.creditos != null) ? (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-md bg-muted/40 px-2.5 py-2 text-xs">
                    <dt className="text-muted-foreground">Duración</dt>
                    <dd className="text-right font-medium text-primary">
                      {programa.duracion ?? '—'}
                    </dd>
                    <dt className="text-muted-foreground">Créditos</dt>
                    <dd className="text-right font-medium text-primary">
                      {programa.creditos != null ? programa.creditos : '—'}
                    </dd>
                    <dt className="text-muted-foreground">Resolución</dt>
                    <dd className="text-right font-medium text-primary">
                      {programa.resolucionCatalogo ?? '—'}
                    </dd>
                    <dt className="text-muted-foreground">Fecha resolución</dt>
                    <dd className="text-right font-medium text-primary">
                      {formatearFechaCatalogo(
                        'fechaResolucionCatalogo' in programa
                          ? programa.fechaResolucionCatalogo
                          : undefined,
                      )}
                    </dd>
                  </dl>
                ) : null}

                {documentos && documentos.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {documentos.map((doc) => (
                      <Badge key={doc.codigoGuia} variant="secondary" className="text-[10px]">
                        {etiquetaDocumentoPanel(doc)}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {esFilaPanel(programa) && programa.fechaResolucion !== undefined ? (
                  <dl className="grid grid-cols-2 gap-x-2 text-xs">
                    <dt className="text-muted-foreground">Resolución MEN (SIAC)</dt>
                    <dd className="text-right font-medium text-primary">
                      {formatearFechaResolucion(programa.fechaResolucion)}
                    </dd>
                    <dt className="text-muted-foreground">Semestre evidencias</dt>
                    <dd className="text-right font-medium text-primary">{programa.semestre ?? '—'}</dd>
                  </dl>
                ) : null}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Avance acreditación</span>
                    <span className="font-semibold text-esmeralda">{programa.porcentajeAvance}%</span>
                  </div>
                  <Progress
                    value={programa.porcentajeAvance}
                    className="h-2"
                    aria-label={`Avance ${programa.porcentajeAvance} por ciento`}
                  />
                </div>

                <div className="mt-auto flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-col gap-1.5">
                    {'semaforoAvance' in programa && programa.semaforoAvance ? (
                      <div className="flex flex-col gap-1">
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
                          'inline-flex w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold',
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
                    <Link
                      href={enlaceDetalle(programa.id)}
                      className={cn(clasesBotonAccionTarjeta, 'w-full shrink-0 sm:w-auto')}
                    >
                      Ver resumen
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  ) : enlaceEvidencias ? (
                    <Link
                      href={enlaceEvidencias}
                      className={cn(clasesBotonAccionTarjeta, 'w-full shrink-0 sm:w-auto')}
                    >
                      Evidencias
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
