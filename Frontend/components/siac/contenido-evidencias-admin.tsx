'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

import { BarraHerramientasTabla } from '@/components/siac/barra-herramientas-tabla'
import { ControlesPaginacion } from '@/components/siac/controles-paginacion'
import { FiltroPrograma } from '@/components/siac/filtro-programa'
import { FiltrosSegmentados } from '@/components/siac/filtros-segmentados'
import { TablaEvidencias } from '@/components/siac/tabla-evidencias'
import { EncabezadoPagina, PanelVacio } from '@/components/siac/tarjeta-acceso'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LIMITE_FILAS_TABLA } from '@/lib/constantes/paginacion'
import { periodoAcademicoActual, periodosConActual } from '@/lib/utilidades/periodo-academico'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { listarEvidenciasApi } from '@/lib/servicios/evidencias.servicio'
import type { CodigoDocumentoGuia, Evidencia } from '@/lib/tipos'
import { ETIQUETAS_GUIA } from '@/lib/utilidades/catalogo-tramites-siac'
import { manejarCambioSelect } from '@/lib/utilidades-siac'

const CODIGOS_GUIA = Object.keys(ETIQUETAS_GUIA) as CodigoDocumentoGuia[]

function reiniciarPaginaAlFiltrar<T>(actualizar: (valor: T) => void, setPagina: (p: number) => void) {
  return (valor: T) => {
    actualizar(valor)
    setPagina(1)
  }
}

const filtrosEstado = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'Borrador', etiqueta: 'Borrador' },
  { valor: 'EnRevision', etiqueta: 'Pendiente de verificación' },
  { valor: 'ConObservaciones', etiqueta: 'Con observaciones' },
  { valor: 'Cumple', etiqueta: 'Cumple' },
  { valor: 'Validado', etiqueta: 'Validados' },
  { valor: 'Rechazado', etiqueta: 'Rechazados' },
]

export interface FiltrosInicialesEvidencias {
  q?: string
  programaId?: string
  codigoGuia?: string
  periodo?: string
  estado?: string
  pagina?: string
}

export function ContenidoEvidenciasAdmin({
  filtrosIniciales,
}: {
  filtrosIniciales: FiltrosInicialesEvidencias
}) {
  const router = useRouter()
  const pathname = usePathname()

  const [evidencias, setEvidencias] = useState<Evidencia[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(Number(filtrosIniciales.pagina ?? '1') || 1)
  const [busqueda, setBusqueda] = useState(filtrosIniciales.q ?? '')
  const [filtroEstado, setFiltroEstado] = useState(filtrosIniciales.estado ?? 'todos')
  const [programaId, setProgramaId] = useState(filtrosIniciales.programaId ?? 'todos')
  const [codigoGuia, setCodigoGuia] = useState<'todos' | CodigoDocumentoGuia>(
    CODIGOS_GUIA.includes(filtrosIniciales.codigoGuia as CodigoDocumentoGuia)
      ? (filtrosIniciales.codigoGuia as CodigoDocumentoGuia)
      : 'todos',
  )
  const [periodo, setPeriodo] = useState(
    filtrosIniciales.periodo ?? periodoAcademicoActual(),
  )
  const periodosDisponibles = periodosConActual()
  const [cargando, setCargando] = useState(true)

  const sincronizarUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (programaId !== 'todos') params.set('programaId', programaId)
    if (codigoGuia !== 'todos') params.set('codigoGuia', codigoGuia)
    if (periodo) params.set('periodo', periodo)
    if (busqueda.trim()) params.set('q', busqueda.trim())
    if (filtroEstado !== 'todos') params.set('estado', filtroEstado)
    if (pagina > 1) params.set('pagina', String(pagina))
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [programaId, codigoGuia, periodo, busqueda, filtroEstado, pagina, pathname, router])

  useEffect(() => {
    sincronizarUrl()
  }, [sincronizarUrl])

  const cargarEvidencias = useCallback(async () => {
    setCargando(true)
    try {
      if (apiDisponible()) {
        const resp = await listarEvidenciasApi({
          pagina,
          limite: LIMITE_FILAS_TABLA,
          programaId: programaId === 'todos' ? undefined : programaId,
          codigoGuia: codigoGuia === 'todos' ? undefined : codigoGuia,
          periodo: periodo || undefined,
          estado: filtroEstado === 'todos' ? undefined : filtroEstado,
          busqueda: busqueda.trim() || undefined,
        })
        setEvidencias(
          resp.datos.map((e) => ({
            ...e,
            fechaCarga:
              typeof e.fechaCarga === 'string'
                ? e.fechaCarga.slice(0, 10)
                : new Date().toISOString().slice(0, 10),
          })),
        )
        setTotal(resp.total)
      }
    } finally {
      setCargando(false)
    }
  }, [pagina, programaId, codigoGuia, periodo, filtroEstado, busqueda])

  useEffect(() => {
    const timer = setTimeout(cargarEvidencias, 300)
    return () => clearTimeout(timer)
  }, [cargarEvidencias])

  const evidenciasFiltradas = useMemo(() => evidencias, [evidencias])

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Gestión documental"
        titulo="Evidencias y documentos"
        descripcion="Consulta evidencias de acreditación por carrera. Los filtros se reflejan en la URL para compartir la vista."
      />

      <BarraHerramientasTabla
        placeholder="Buscar por nombre o programa…"
        valorBusqueda={busqueda}
        onBuscar={reiniciarPaginaAlFiltrar(setBusqueda, setPagina)}
      >
        <FiltroPrograma
          valor={programaId}
          onCambiar={reiniciarPaginaAlFiltrar(setProgramaId, setPagina)}
        />
        <Select
          value={codigoGuia}
          onValueChange={manejarCambioSelect(
            reiniciarPaginaAlFiltrar(
              (valor: string) => setCodigoGuia(valor as 'todos' | CodigoDocumentoGuia),
              setPagina,
            ),
          )}
        >
          <SelectTrigger className="w-[180px]" aria-label="Filtrar por guía">
            <SelectValue placeholder="Guía" />
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
        <Select
          value={periodo}
          onValueChange={manejarCambioSelect(reiniciarPaginaAlFiltrar(setPeriodo, setPagina))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            {periodosDisponibles.map((valor) => (
              <SelectItem key={valor} value={valor}>
                {valor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FiltrosSegmentados
          opciones={filtrosEstado}
          valorActivo={filtroEstado}
          onCambiar={reiniciarPaginaAlFiltrar(setFiltroEstado, setPagina)}
        />
      </BarraHerramientasTabla>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.info('Exportación disponible en backend')}
        >
          <Download className="size-4" />
          Exportar
        </Button>
      </div>

      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando evidencias…</p>
      ) : evidenciasFiltradas.length === 0 ? (
        <PanelVacio mensaje="No se encontraron evidencias." />
      ) : (
        <>
          <TablaEvidencias
            evidencias={evidenciasFiltradas}
            enlaceDetalle={(id) => `/administrador/evidencias/${id}`}
          />
          <ControlesPaginacion
            pagina={pagina}
            limite={LIMITE_FILAS_TABLA}
            total={total}
            onCambiarPagina={setPagina}
          />
        </>
      )}
    </div>
  )
}
