import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MoreHorizontal } from 'lucide-react'

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
import type { Programa } from '@/lib/tipos'
import { obtenerInicialesPrograma } from '@/lib/utilidades-siac'

interface RejillaProgramasProps {
  programas: Programa[]
  enlaceEvidencias?: string
  enlaceDetalle?: (id: string) => string
}

export function RejillaProgramas({
  programas,
  enlaceEvidencias,
  enlaceDetalle,
}: RejillaProgramasProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {programas.map((programa, indice) => (
        <Card key={programa.id} className="overflow-hidden">
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
                  {programa.codigo} · {programa.nivel}
                </p>
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

            <div className="space-y-2 px-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avance acreditación</span>
                <span className="font-semibold text-esmeralda">{programa.porcentajeAvance}%</span>
              </div>
              <Progress value={programa.porcentajeAvance} className="h-2" />
            </div>

            <div className="flex items-center justify-between px-1 pb-2">
              <div className="flex flex-col gap-1">
                <Semaforo valor={programa.semaforo} />
                <span className="text-xs text-muted-foreground">{programa.estadoProceso}</span>
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
      ))}
    </div>
  )
}
