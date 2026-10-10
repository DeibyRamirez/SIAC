'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
} from 'lucide-react'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { EstructuraNormativaPanel } from '@/components/siac/estructura-normativa-panel'
import { GraficoDistribucion } from '@/components/siac/grafico-distribucion'
import { GraficoTendencia } from '@/components/siac/grafico-tendencia'
import { PanelAvanceEtapasSIAC } from '@/components/siac/panel-avance-etapas-siac'
import { TarjetaHeroAcreditacion } from '@/components/siac/tarjeta-hero-acreditacion'
import { TarjetaKpi } from '@/components/siac/tarjeta-kpi'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  calcularDistribucionEstadosAdministrador,
  calcularTendenciaMensual,
  filtrarEvidenciasVisiblesAdministrador,
} from '@/lib/utilidades/metricas-evidencias'
import { periodoAcademicoActual, periodosConActual } from '@/lib/utilidades/periodo-academico'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  listarProgramasApi,
  obtenerAvanceInstitucionalApi,
} from '@/lib/servicios/programas.servicio'
import { promedioAvanceProgramasActivos } from '@/lib/utilidades/avance-institucional'
import type { Programa } from '@/lib/tipos'
import { ROLES_CONSULTA_INSTITUCIONAL } from '@/lib/auth-mock'
import {
  obtenerProgresoProgramaApi,
  type ProgresoProcesoSIAC,
} from '@/lib/servicios/progreso-programa.servicio'
import { contarEvidenciasPendientes, manejarCambioSelect, obtenerSaludo } from '@/lib/utilidades-siac'

export default function ResumenAdministradorPage() {
  return (
    <PlantillaPaginaApp titulo="Resumen general" roles={ROLES_CONSULTA_INSTITUCIONAL}>
      <ContenidoResumen />
    </PlantillaPaginaApp>
  )
}

function ContenidoResumen() {
  const { sesion } = usarSesion()
  const { datos } = usarAlmacen()
  const [periodo, setPeriodo] = useState(periodoAcademicoActual())
  const periodosDisponibles = periodosConActual()
  const [programas, setProgramas] = useState<Programa[]>([])
  const [programaProcesoId, setProgramaProcesoId] = useState<string | null>(null)
  const [progresoProceso, setProgresoProceso] = useState<ProgresoProcesoSIAC | null>(null)
  const [cargandoProgreso, setCargandoProgreso] = useState(false)
  const [avanceInstitucional, setAvanceInstitucional] = useState<number | null>(null)

  useEffect(() => {
    async function cargar() {
      if (!apiDisponible()) return
      try {
        const [lista, resumen] = await Promise.all([
          listarProgramasApi(),
          obtenerAvanceInstitucionalApi(),
        ])
        setProgramas(lista)
        setAvanceInstitucional(resumen.avanceInstitucional)
        if (lista.length > 0 && !programaProcesoId) {
          setProgramaProcesoId(lista[0].id)
        }
      } catch {
        setProgramas([])
        setAvanceInstitucional(null)
      }
    }
    cargar()
  }, [])

  const evidenciasPeriodo = useMemo(
    () => datos.evidencias.filter((e) => e.periodo === periodo),
    [datos.evidencias, periodo],
  )

  const evidenciasPanelAdmin = useMemo(
    () => filtrarEvidenciasVisiblesAdministrador(evidenciasPeriodo),
    [evidenciasPeriodo],
  )

  const validadas = useMemo(
    () =>
      evidenciasPanelAdmin.filter((e) => e.estado === 'Validado' || e.estado === 'Cumple').length,
    [evidenciasPanelAdmin],
  )
  const enProceso = useMemo(
    () =>
      evidenciasPanelAdmin.filter(
        (e) =>
          e.estado === 'EnRevision' ||
          e.estado === 'ConObservaciones' ||
          e.estado === 'Rechazado',
      ).length,
    [evidenciasPanelAdmin],
  )
  const porVencer = datos.anexosVigencia.filter((a) => a.estado === 'Proximo').length
  const pendientes = contarEvidenciasPendientes(datos.evidencias)

  const pregrado = programas.filter((p) => p.nivel === 'Pregrado').length
  const posgrado = programas.filter((p) => p.nivel === 'Posgrado').length
  const avanceHero =
    avanceInstitucional ??
    (programas.length > 0 ? promedioAvanceProgramasActivos(programas) : 0)

  useEffect(() => {
    async function cargarProgreso() {
      if (!programaProcesoId || !apiDisponible()) {
        setProgresoProceso(null)
        return
      }
      setCargandoProgreso(true)
      try {
        const progreso = await obtenerProgresoProgramaApi(programaProcesoId)
        setProgresoProceso(progreso)
      } catch {
        setProgresoProceso(null)
      } finally {
        setCargandoProgreso(false)
      }
    }
    cargarProgreso()
  }, [programaProcesoId])

  const distribucion = useMemo(
    () => calcularDistribucionEstadosAdministrador(evidenciasPeriodo),
    [evidenciasPeriodo],
  )
  const tendencia = useMemo(
    () => calcularTendenciaMensual(filtrarEvidenciasVisiblesAdministrador(datos.evidencias)),
    [datos.evidencias],
  )

  const primerNombre = sesion?.nombre.split(' ')[0] ?? 'Administrador'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <EncabezadoPagina
          etiqueta="Panel institucional"
          titulo={`${obtenerSaludo()}, ${primerNombre}`}
          descripcion="Estado general del aseguramiento de calidad en todas las carreras."
        />
        <Select value={periodo} onValueChange={manejarCambioSelect(setPeriodo)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            {periodosDisponibles.map((p) => (
              <SelectItem key={p} value={p}>
                Periodo {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TarjetaHeroAcreditacion
        avance={avanceHero}
        evidenciasValidadas={validadas}
        evidenciasEnProceso={enProceso}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi
          titulo="Programas activos"
          valor={programas.length || '—'}
          descripcion={`${pregrado} pregrado · ${posgrado} posgrado`}
          icono={GraduationCap}
          acento="cyan"
        />
        <TarjetaKpi
          titulo="Evidencias validadas"
          valor={validadas}
          tendencia={{ valor: `Periodo ${periodo}`, positiva: true }}
          icono={CheckCircle2}
          acento="esmeralda"
        />
        <TarjetaKpi
          titulo="Documentos por vencer"
          valor={porVencer}
          descripcion="Requiere atención este mes"
          icono={AlertTriangle}
          acento="coral"
        />
        <TarjetaKpi
          titulo="Tareas pendientes"
          valor={String(pendientes).padStart(2, '0')}
          descripcion="En bandeja de revisión"
          icono={ClipboardList}
          acento="purpura"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <GraficoTendencia datos={tendencia} />
        <GraficoDistribucion datos={distribucion} totalEtiqueta="Total en seguimiento" />
      </div>

      <PanelAvanceEtapasSIAC
        programas={programas}
        programaId={programaProcesoId}
        onCambiarPrograma={setProgramaProcesoId}
        progreso={progresoProceso}
        cargando={cargandoProgreso}
      />

      {/* <EstructuraNormativaPanel /> */}
    </div>
  )
}
