'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
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
import { ROLES_CONSULTA_INSTITUCIONAL } from '@/lib/auth-mock'
import { LIMITE_FILAS_TABLA } from '@/lib/constantes/paginacion'
import { factoresSemilla, periodosSemilla } from '@/lib/datos-semilla'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { listarEvidenciasApi } from '@/lib/servicios/evidencias.servicio'
import type { Evidencia } from '@/lib/tipos'
import { manejarCambioSelect } from '@/lib/utilidades-siac'

function reiniciarPaginaAlFiltrar<T>(actualizar: (valor: T) => void, setPagina: (p: number) => void) {
  return (valor: T) => {
    actualizar(valor)
    setPagina(1)
  }
}

const filtrosEstado = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'Borrador', etiqueta: 'Borrador' },
  { valor: 'EnRevision', etiqueta: 'En revisión' },
  { valor: 'Validado', etiqueta: 'Aprobados' },
  { valor: 'Rechazado', etiqueta: 'Corrección' },
]

export default function EvidenciasAdministradorPage() {
  return (
    <PlantillaPaginaApp titulo="Evidencias y documentos" roles={ROLES_CONSULTA_INSTITUCIONAL}>
      <ContenidoEvidencias />
    </PlantillaPaginaApp>
  )
}

function ContenidoEvidencias() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [evidencias, setEvidencias] = useState<Evidencia[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(Number(searchParams.get('pagina') ?? '1') || 1)
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroEstado, setFiltroEstado] = useState(searchParams.get('estado') ?? 'todos')
  const [programaId, setProgramaId] = useState(searchParams.get('programaId') ?? 'todos')
  const [factor, setFactor] = useState(searchParams.get('factor') ?? 'todos')
  const [periodo, setPeriodo] = useState(searchParams.get('periodo') ?? 'todos')
  const [cargando, setCargando] = useState(true)

  const sincronizarUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (programaId !== 'todos') params.set('programaId', programaId)
    if (factor !== 'todos') params.set('factor', factor)
    if (periodo !== 'todos') params.set('periodo', periodo)
    if (busqueda.trim()) params.set('q', busqueda.trim())
    if (filtroEstado !== 'todos') params.set('estado', filtroEstado)
    if (pagina > 1) params.set('pagina', String(pagina))
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [programaId, factor, periodo, busqueda, filtroEstado, pagina, pathname, router])

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
          factor: factor === 'todos' ? undefined : factor,
          periodo: periodo === 'todos' ? undefined : periodo,
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
  }, [pagina, programaId, factor, periodo, filtroEstado, busqueda])

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
        placeholder="Buscar por nombre, programa o factor…"
        valorBusqueda={busqueda}
        onBuscar={reiniciarPaginaAlFiltrar(setBusqueda, setPagina)}
      >
        <FiltroPrograma
          valor={programaId}
          onCambiar={reiniciarPaginaAlFiltrar(setProgramaId, setPagina)}
        />
        <Select
          value={factor}
          onValueChange={manejarCambioSelect(reiniciarPaginaAlFiltrar(setFactor, setPagina))}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Factor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los factores</SelectItem>
            {factoresSemilla.map((valor) => (
              <SelectItem key={valor} value={valor}>
                {valor}
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
            <SelectItem value="todos">Todos</SelectItem>
            {periodosSemilla.map((valor) => (
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
