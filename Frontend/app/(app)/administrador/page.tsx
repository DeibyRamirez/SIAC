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
  distribucionEstadosSemilla,
  periodosSemilla,
  tendenciaMensualSemilla,
} from '@/lib/datos-semilla'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { listarProgramasApi } from '@/lib/servicios/programas.servicio'
import type { Programa } from '@/lib/tipos'
import { ROLES_CONSULTA_INSTITUCIONAL } from '@/lib/auth-mock'
import { calcularAvanceEtapasSIAC } from '@/lib/utilidades/avance-etapas-siac'
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
  const [periodo, setPeriodo] = useState(periodosSemilla[0] ?? '2024-1')
  const [programas, setProgramas] = useState<Programa[]>([])

  useEffect(() => {
    async function cargar() {
      if (!apiDisponible()) return
      try {
        const lista = await listarProgramasApi()
        setProgramas(lista)
      } catch {
        setProgramas([])
      }
    }
    cargar()
  }, [])

  const evidenciasPeriodo = useMemo(
    () => datos.evidencias.filter((e) => e.periodo === periodo),
    [datos.evidencias, periodo],
  )

  const validadas = useMemo(
    () => evidenciasPeriodo.filter((e) => e.estado === 'Validado').length,
    [evidenciasPeriodo],
  )
  const enProceso = useMemo(
    () =>
      evidenciasPeriodo.filter((e) => e.estado === 'Borrador' || e.estado === 'EnRevision').length,
    [evidenciasPeriodo],
  )
  const porVencer = datos.anexosVigencia.filter((a) => a.estado === 'Proximo').length
  const pendientes = contarEvidenciasPendientes(datos.evidencias)

  const pregrado = programas.filter((p) => p.nivel === 'Pregrado').length
  const posgrado = programas.filter((p) => p.nivel === 'Posgrado').length
  const avancePromedio =
    programas.length > 0
      ? Math.round(programas.reduce((acc, p) => acc + p.porcentajeAvance, 0) / programas.length)
      : 0

  const avanceEtapas = useMemo(
    () =>
      calcularAvanceEtapasSIAC({
        etapas: datos.etapas,
        carpetas: datos.carpetas,
        documentosRequeridos: datos.documentosRequeridos,
        evidencias: datos.evidencias,
      }),
    [datos.etapas, datos.carpetas, datos.documentosRequeridos, datos.evidencias],
  )

  const distribucion = useMemo(
    () => [
      { estado: 'Validadas', valor: validadas, clave: 'validadas' },
      {
        estado: 'En revisión',
        valor: evidenciasPeriodo.filter((e) => e.estado === 'EnRevision').length,
        clave: 'revision',
      },
      {
        estado: 'Borrador',
        valor: evidenciasPeriodo.filter((e) => e.estado === 'Borrador').length,
        clave: 'borrador',
      },
    ],
    [evidenciasPeriodo, validadas],
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
            {periodosSemilla.map((p) => (
              <SelectItem key={p} value={p}>
                Periodo {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TarjetaHeroAcreditacion
        avance={avancePromedio || avanceEtapas.avanceGlobal}
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
        <GraficoTendencia datos={tendenciaMensualSemilla} />
        <GraficoDistribucion
          datos={distribucion.length > 0 ? distribucion : distribucionEstadosSemilla}
          totalEtiqueta="Total evidencias"
        />
      </div>

      <PanelAvanceEtapasSIAC resumen={avanceEtapas} />

      <EstructuraNormativaPanel />
    </div>
  )
}
