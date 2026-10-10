'use client'

import type { ReactNode } from 'react'
import { Download, Search } from 'lucide-react'

import { FiltroPrograma } from '@/components/siac/filtro-programa'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CodigoDocumentoGuia } from '@/lib/tipos'
import { ETIQUETAS_GUIA } from '@/lib/utilidades/catalogo-tramites-siac'
import { periodosConActual } from '@/lib/utilidades/periodo-academico'
import { PERIODO_TODOS } from '@/lib/utilidades/parametros-busqueda-url'
import { OpcionFiltroSemaforo } from '@/components/siac/opcion-filtro-semaforo'
import { OPCIONES_FILTRO_SEMAFORO_BUSQUEDA } from '@/lib/utilidades/etiquetas-semaforo'
import { manejarCambioSelect } from '@/lib/utilidades-siac'

const CODIGOS_GUIA = Object.keys(ETIQUETAS_GUIA) as CodigoDocumentoGuia[]

const filtrosEstado = [
  { valor: 'todos', etiqueta: 'Todos los estados' },
  { valor: 'Borrador', etiqueta: 'Borrador' },
  { valor: 'EnRevision', etiqueta: 'Pendiente de verificación' },
  { valor: 'ConObservaciones', etiqueta: 'Con observaciones' },
  { valor: 'Cumple', etiqueta: 'Cumple' },
  { valor: 'Validado', etiqueta: 'Validados' },
  { valor: 'Rechazado', etiqueta: 'Rechazados' },
]

const opcionesFormato = [
  { valor: 'todos', etiqueta: 'Todos los formatos' },
  { valor: 'pdf', etiqueta: 'PDF' },
  { valor: 'xlsx', etiqueta: 'Excel (XLSX)' },
]

export interface ValoresFiltrosBusqueda {
  busqueda: string
  programa: string
  codigoGuia: 'todos' | CodigoDocumentoGuia
  periodo: string
  estado: string
  puntajeMin: string
  puntajeMax: string
  semaforo: string
  formato: string
  fechaCargaDesde: string
  fechaCargaHasta: string
  fechaVerificacionDesde: string
  fechaVerificacionHasta: string
}

interface FiltrosBusquedaEvidenciasProps {
  valores: ValoresFiltrosBusqueda
  onCambiar: (parcial: Partial<ValoresFiltrosBusqueda>) => void
  onExportar?: () => void
  onLimpiar?: () => void
  mostrarLimpiar?: boolean
}

function CampoFiltro({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {etiqueta}
      </Label>
      {children}
    </div>
  )
}

export function FiltrosBusquedaEvidencias({
  valores,
  onCambiar,
  onExportar,
  onLimpiar,
  mostrarLimpiar = false,
}: FiltrosBusquedaEvidenciasProps) {
  const periodosDisponibles = periodosConActual()
  // `items` permite que el disparador muestre la etiqueta («Todos los periodos») y no el valor interno.
  const opcionesPeriodo = [
    { value: PERIODO_TODOS, label: 'Todos los periodos' },
    ...periodosDisponibles.map((valor) => ({ value: valor, label: valor })),
  ]

  return (
    <Card className="tarjeta-institucional">
      <CardHeader>
        <CardTitle>Filtros de búsqueda</CardTitle>
        {(mostrarLimpiar || onExportar) && (
          <CardAction className="flex flex-wrap gap-2">
            {mostrarLimpiar && onLimpiar ? (
              <Button variant="ghost" size="sm" onClick={onLimpiar}>
                Limpiar filtros
              </Button>
            ) : null}
            {onExportar ? (
              <Button variant="outline" size="sm" onClick={onExportar}>
                <Download className="size-4" />
                Exportar
              </Button>
            ) : null}
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder="Buscar por nombre, archivo o guía…"
            value={valores.busqueda}
            onChange={(e) => onCambiar({ busqueda: e.target.value })}
            className="pl-9"
            aria-label="Buscar evidencias"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CampoFiltro etiqueta="Programa">
            <FiltroPrograma
              valor={valores.programa}
              onCambiar={(slug) => onCambiar({ programa: slug })}
              usarSlug
              className="w-full"
            />
          </CampoFiltro>
          <CampoFiltro etiqueta="Guía">
            <Select
              value={valores.codigoGuia}
              onValueChange={manejarCambioSelect((valor) =>
                onCambiar({ codigoGuia: valor as 'todos' | CodigoDocumentoGuia }),
              )}
            >
              <SelectTrigger className="w-full" aria-label="Filtrar por guía">
                <SelectValue placeholder="Todas las guías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las guías</SelectItem>
                {CODIGOS_GUIA.map((codigo) => (
                  <SelectItem key={codigo} value={codigo}>
                    {codigo} — {ETIQUETAS_GUIA[codigo]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CampoFiltro>
          <CampoFiltro etiqueta="Periodo">
            <Select
              value={valores.periodo}
              items={opcionesPeriodo}
              onValueChange={manejarCambioSelect((valor) => onCambiar({ periodo: valor }))}
            >
              <SelectTrigger className="w-full" aria-label="Filtrar por periodo">
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PERIODO_TODOS}>Todos los periodos</SelectItem>
                {periodosDisponibles.map((valor) => (
                  <SelectItem key={valor} value={valor}>
                    {valor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CampoFiltro>
          <CampoFiltro etiqueta="Estado">
            <Select
              value={valores.estado}
              onValueChange={manejarCambioSelect((valor) => onCambiar({ estado: valor }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {filtrosEstado.map((opcion) => (
                  <SelectItem key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CampoFiltro>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-primary/10 pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <CampoFiltro etiqueta="Semáforo">
            <Select
              value={valores.semaforo}
              onValueChange={manejarCambioSelect((valor) => onCambiar({ semaforo: valor }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semáforo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {OPCIONES_FILTRO_SEMAFORO_BUSQUEDA.map((opcion) => (
                  <SelectItem key={opcion.valor} value={opcion.valor}>
                    <OpcionFiltroSemaforo valor={opcion.valor} contexto={opcion.contexto} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CampoFiltro>
          <CampoFiltro etiqueta="Formato">
            <Select
              value={valores.formato}
              onValueChange={manejarCambioSelect((valor) => onCambiar({ formato: valor }))}
            >
              <SelectTrigger className="w-full" aria-label="Filtrar por formato de archivo">
                <SelectValue placeholder="Formato" />
              </SelectTrigger>
              <SelectContent>
                {opcionesFormato.map((opcion) => (
                  <SelectItem key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CampoFiltro>
          <CampoFiltro etiqueta="Puntaje mínimo">
            <Input
              type="number"
              min={0}
              max={9}
              placeholder="0"
              value={valores.puntajeMin}
              onChange={(e) => onCambiar({ puntajeMin: e.target.value })}
            />
          </CampoFiltro>
          <CampoFiltro etiqueta="Puntaje máximo">
            <Input
              type="number"
              min={0}
              max={9}
              placeholder="9"
              value={valores.puntajeMax}
              onChange={(e) => onCambiar({ puntajeMax: e.target.value })}
            />
          </CampoFiltro>
          <CampoFiltro etiqueta="Carga desde">
            <Input
              type="date"
              value={valores.fechaCargaDesde}
              onChange={(e) => onCambiar({ fechaCargaDesde: e.target.value })}
              aria-label="Fecha carga desde"
            />
          </CampoFiltro>
          <CampoFiltro etiqueta="Carga hasta">
            <Input
              type="date"
              value={valores.fechaCargaHasta}
              onChange={(e) => onCambiar({ fechaCargaHasta: e.target.value })}
              aria-label="Fecha carga hasta"
            />
          </CampoFiltro>
          <CampoFiltro etiqueta="Verificación desde">
            <Input
              type="date"
              value={valores.fechaVerificacionDesde}
              onChange={(e) => onCambiar({ fechaVerificacionDesde: e.target.value })}
              aria-label="Fecha verificación desde"
            />
          </CampoFiltro>
          <CampoFiltro etiqueta="Verificación hasta">
            <Input
              type="date"
              value={valores.fechaVerificacionHasta}
              onChange={(e) => onCambiar({ fechaVerificacionHasta: e.target.value })}
              aria-label="Fecha verificación hasta"
            />
          </CampoFiltro>
        </div>
      </CardContent>
    </Card>
  )
}
