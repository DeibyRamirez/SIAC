'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { FiltroPrograma } from '@/components/siac/filtro-programa'
import { TablaEvidencias } from '@/components/siac/tabla-evidencias'
import { EncabezadoPagina, PanelVacio } from '@/components/siac/tarjeta-acceso'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { listarPendientesApi } from '@/lib/servicios/evidencias.servicio'
import type { Evidencia } from '@/lib/tipos'

function mapearEvidencia(e: Evidencia): Evidencia {
  return {
    ...e,
    fechaCarga:
      typeof e.fechaCarga === 'string'
        ? e.fechaCarga.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
  }
}

function pendientesDesdeSemilla(evidencias: Evidencia[]): Evidencia[] {
  return evidencias.filter((e) => e.estado === 'EnRevision').map(mapearEvidencia)
}

export default function BandejaRevisorPage() {
  return (
    <PlantillaPaginaApp titulo="Bandeja de revisión" rol="Revisor">
      <ContenidoBandeja />
    </PlantillaPaginaApp>
  )
}

function ContenidoBandeja() {
  const { datos } = usarAlmacen()
  const [pendientes, setPendientes] = useState<Evidencia[]>([])
  const [cargando, setCargando] = useState(true)
  const [programaId, setProgramaId] = useState('todos')
  const [origenDatos, setOrigenDatos] = useState<'api' | 'semilla'>('api')

  const cargarPendientes = useCallback(async () => {
    setCargando(true)
    try {
      if (apiDisponible()) {
        try {
          const resp = await listarPendientesApi()
          const mapeadas = resp.datos.map(mapearEvidencia)
          if (mapeadas.length > 0) {
            setPendientes(mapeadas)
            setOrigenDatos('api')
            return
          }
        } catch {
          // Fallback a semilla local si la API falla
        }
      }

      const semilla = pendientesDesdeSemilla(datos.evidencias)
      setPendientes(semilla)
      setOrigenDatos('semilla')
    } finally {
      setCargando(false)
    }
  }, [datos.evidencias])

  useEffect(() => {
    cargarPendientes()
    const intervalo = setInterval(cargarPendientes, 30000)
    const alFoco = () => cargarPendientes()
    window.addEventListener('focus', alFoco)
    return () => {
      clearInterval(intervalo)
      window.removeEventListener('focus', alFoco)
    }
  }, [cargarPendientes])

  const filtradas = useMemo(
    () =>
      programaId === 'todos'
        ? pendientes
        : pendientes.filter((evidencia) => evidencia.programaId === programaId),
    [pendientes, programaId],
  )

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Flujo de aprobación"
        titulo="Bandeja de revisión"
        descripcion={
          origenDatos === 'semilla'
            ? 'Mostrando evidencias de demostración. Conecte la API y ejecute la semilla del backend para datos reales.'
            : 'Evidencias en revisión pendientes de dictamen. Se actualiza automáticamente.'
        }
      />

      <FiltroPrograma valor={programaId} onCambiar={setProgramaId} />

      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando bandeja…</p>
      ) : filtradas.length === 0 ? (
        <PanelVacio mensaje="No hay evidencias pendientes de revisión." />
      ) : (
        <TablaEvidencias
          evidencias={filtradas}
          enlaceDetalle={(id) => `/revisor/bandeja/${id}`}
        />
      )}
    </div>
  )
}
