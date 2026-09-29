'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { toast } from 'sonner'

import { usarSesion } from '@/components/auth/proveedor-sesion'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { Semaforo } from '@/components/siac/insignia-estado'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { TarjetaKpi } from '@/components/siac/tarjeta-kpi'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ROLES_CONSULTA_INSTITUCIONAL } from '@/lib/auth-mock'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  actualizarEstadoProgramaApi,
  actualizarProgramaApi,
  obtenerProgramaApi,
} from '@/lib/servicios/programas.servicio'
import type { NivelPrograma, Programa } from '@/lib/tipos'

export default function DetalleProgramaPage() {
  return (
    <PlantillaPaginaApp titulo="Resumen del programa" roles={ROLES_CONSULTA_INSTITUCIONAL}>
      <ContenidoDetallePrograma />
    </PlantillaPaginaApp>
  )
}

function ContenidoDetallePrograma() {
  const params = useParams<{ id: string }>()
  const { sesion } = usarSesion()
  const puedeAdministrar = sesion?.rol === 'Administrador' || sesion?.rol === 'SuperAdmin'
  const [programa, setPrograma] = useState<
    (Programa & { evidencias?: { estado: string }[]; anexos?: { estado: string }[] }) | null
  >(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [facultad, setFacultad] = useState('')
  const [nivel, setNivel] = useState<NivelPrograma>('Pregrado')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    async function cargar() {
      if (!apiDisponible()) {
        setErrorCarga('No hay conexión con la API.')
        setCargando(false)
        return
      }
      try {
        const data = await obtenerProgramaApi(params.id)
        const programaCargado = data as Programa & {
          evidencias?: { estado: string }[]
          anexos?: { estado: string }[]
        }
        setPrograma(programaCargado)
        setNombre(programaCargado.nombre)
        setFacultad(programaCargado.facultad ?? '')
        setNivel(programaCargado.nivel)
        setErrorCarga(null)
      } catch (err) {
        setPrograma(null)
        setErrorCarga(err instanceof Error ? err.message : 'No se pudo cargar el programa.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [params.id])

  const conteos = useMemo(() => {
    if (programa?.conteosEstado) {
      return {
        validadas: programa.conteosEstado.validado + (programa.conteosEstado.cumple ?? 0),
        enRevision: programa.conteosEstado.enRevision,
        rechazadas:
          programa.conteosEstado.rechazado + (programa.conteosEstado.conObservaciones ?? 0),
        anexosProximos: (programa.anexos ?? []).filter((a) => a.estado === 'Proximo').length,
      }
    }
    const evidencias = programa?.evidencias ?? []
    return {
      validadas: evidencias.filter((e) => e.estado === 'Validado' || e.estado === 'Cumple').length,
      enRevision: evidencias.filter((e) => e.estado === 'EnRevision').length,
      rechazadas: evidencias.filter(
        (e) => e.estado === 'Rechazado' || e.estado === 'ConObservaciones',
      ).length,
      anexosProximos: (programa?.anexos ?? []).filter((a) => a.estado === 'Proximo').length,
    }
  }, [programa])

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando programa…</p>
  }

  if (!programa) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{errorCarga ?? 'Programa no encontrado.'}</p>
        <Link href="/administrador/programas">
          <Button variant="outline">Volver</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Acreditación por carrera"
        titulo={programa.nombre}
        descripcion={`${programa.codigo}${programa.slug ? ` · ${programa.slug}` : ''} · ${programa.nivel}${programa.facultad ? ` · ${programa.facultad}` : ''}${programa.activo === false ? ' · Inactivo' : ''}`}
        accion={
          <Link href="/administrador/programas">
            <Button variant="outline">Volver al catálogo</Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Avance de acreditación</span>
            <span className="font-semibold text-esmeralda">{programa.porcentajeAvance}%</span>
          </div>
          <Progress value={programa.porcentajeAvance} className="h-3" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Semáforo institucional (RN-003)</span>
            <Semaforo valor={programa.semaforo} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <TarjetaKpi titulo="Cumplen o validadas" valor={String(conteos.validadas)} />
        <TarjetaKpi titulo="Pendientes de verificación" valor={String(conteos.enRevision)} />
        <TarjetaKpi titulo="Con observaciones" valor={String(conteos.rechazadas)} />
        <TarjetaKpi titulo="Docs por vencer" valor={String(conteos.anexosProximos)} />
      </div>

      {puedeAdministrar ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="font-semibold text-primary">Editar programa</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="editar-nombre">Nombre</Label>
                <Input id="editar-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editar-facultad">Facultad</Label>
                <Input
                  id="editar-facultad"
                  value={facultad}
                  onChange={(e) => setFacultad(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editar-nivel">Nivel</Label>
                <select
                  id="editar-nivel"
                  value={nivel}
                  onChange={(e) => setNivel(e.target.value as NivelPrograma)}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                >
                  <option value="Pregrado">Pregrado</option>
                  <option value="Posgrado">Posgrado</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                disabled={guardando || !nombre.trim()}
                onClick={async () => {
                  setGuardando(true)
                  try {
                    const actualizado = await actualizarProgramaApi(programa.id, {
                      nombre: nombre.trim(),
                      facultad: facultad.trim(),
                      nivel,
                    })
                    setPrograma((prev) => (prev ? { ...prev, ...actualizado } : prev))
                    toast.success('Programa actualizado.')
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'No se pudo actualizar.')
                  } finally {
                    setGuardando(false)
                  }
                }}
              >
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </Button>
              <Button
                variant="outline"
                disabled={guardando}
                onClick={async () => {
                  setGuardando(true)
                  try {
                    const activo = programa.activo === false
                    const actualizado = await actualizarEstadoProgramaApi(programa.id, activo)
                    setPrograma((prev) => (prev ? { ...prev, ...actualizado } : prev))
                    toast.success(activo ? 'Programa activado.' : 'Programa desactivado.')
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'No se pudo cambiar el estado.')
                  } finally {
                    setGuardando(false)
                  }
                }}
              >
                {programa.activo === false ? 'Activar programa' : 'Desactivar programa'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link href={`/administrador/evidencias?programaId=${programa.id}`}>
          <Button>Ver evidencias de este programa</Button>
        </Link>
        <Link href="/administrador/plantillas">
          <Button variant="outline">Plantillas compartidas</Button>
        </Link>
        <Link href={`/administrador/vigencias?programaId=${programa.id}`}>
          <Button variant="outline">Vigencias del programa</Button>
        </Link>
      </div>
    </div>
  )
}
