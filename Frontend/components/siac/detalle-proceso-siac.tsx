'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

import { usarSesion } from '@/components/auth/proveedor-sesion'
import { BarraVigenciaRegistro } from '@/components/siac/barra-vigencia-registro'
import { ProcesoProgramaDetalle } from '@/components/siac/proceso-programa-detalle'
import { Semaforo } from '@/components/siac/insignia-estado'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { TarjetaKpi } from '@/components/siac/tarjeta-kpi'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { USAR_MOCK_PROGRAMAS_ADMIN } from '@/lib/config-programas-admin'
import { ID_INSTITUCION_MOCK } from '@/lib/datos-mock/programas-admin.mock'
import type { ProgresoProcesoSIAC } from '@/lib/servicios/progreso-programa.servicio'
import {
  activarVigenciaInstitucionApi,
  actualizarInstitucionApi,
  obtenerInstitucionApi,
  obtenerProgresoInstitucionApi,
} from '@/lib/servicios/institucion.servicio'
import {
  activarVigenciaMock,
  actualizarEstadoProgramaMock,
  actualizarProgramaMock,
  obtenerProgresoProgramaMock,
  obtenerProgramaMock,
} from '@/lib/servicios/programas-admin.mock.servicio'
import {
  activarVigenciaProgramaApi,
  actualizarEstadoProgramaApi,
  actualizarProgramaApi,
  obtenerProgramaApi,
} from '@/lib/servicios/programas.servicio'
import { obtenerProgresoProgramaApi } from '@/lib/servicios/progreso-programa.servicio'
import type { NivelPrograma, Programa, SemaforoPrograma } from '@/lib/tipos'
import {
  CATALOGO_TRAMITES_SIAC,
  type TipoTramiteSIAC,
} from '@/lib/utilidades/catalogo-tramites-siac'
import { calcularSemaforoVigencia, mensajeAlertaVigencia } from '@/lib/utilidades/vigencia-registro'

type ProgramaDetalle = Programa & {
  fechaResolucion?: string | null
  tipoTramite?: TipoTramiteSIAC
  alcance?: 'Programa' | 'Institucion'
  evidencias?: { estado: string }[]
  anexos?: { estado: string }[]
  conteosEstado?: {
    borrador: number
    enRevision: number
    conObservaciones: number
    cumple: number
    validado: number
    rechazado: number
  }
}

interface DetalleProcesoSIACProps {
  entidadId?: string
  esInstitucion?: boolean
}

function normalizarFechaResolucion(valor: unknown): string | null {
  if (!valor) return null
  if (typeof valor === 'string') return valor
  if (valor instanceof Date) return valor.toISOString()
  return null
}

function mapearInstitucionADetalle(data: {
  id: string
  nombre: string
  codigo: string
  tipoTramiteActivo: TipoTramiteSIAC
  fechaResolucion?: string | Date | null
  porcentajeAvance: number
  semaforo: SemaforoPrograma
  estadoProceso: string
  evidencias?: { estado: string }[]
  conteosEstado?: ProgramaDetalle['conteosEstado']
}): ProgramaDetalle {
  return {
    id: data.id,
    nombre: data.nombre,
    codigo: data.codigo,
    slug: 'institucion',
    nivel: 'Pregrado',
    facultad: '',
    semaforo: data.semaforo,
    porcentajeAvance: data.porcentajeAvance,
    estadoProceso: data.estadoProceso,
    tipoTramiteActivo: data.tipoTramiteActivo,
    fechaResolucion: normalizarFechaResolucion(data.fechaResolucion),
    alcance: 'Institucion',
    evidencias: data.evidencias,
    conteosEstado: data.conteosEstado,
    activo: true,
  }
}

export function DetalleProcesoSIAC({ entidadId, esInstitucion = false }: DetalleProcesoSIACProps) {
  const { sesion } = usarSesion()
  const puedeAdministrar = sesion?.rol === 'Administrador' || sesion?.rol === 'SuperAdmin'
  const [programa, setPrograma] = useState<ProgramaDetalle | null>(null)
  const [progreso, setProgreso] = useState<ProgresoProcesoSIAC | null>(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [facultad, setFacultad] = useState('')
  const [nivel, setNivel] = useState<NivelPrograma>('Pregrado')
  const [tipoTramiteActivo, setTipoTramiteActivo] =
    useState<TipoTramiteSIAC>('RenovacionRegistroCalificado')
  const [guardando, setGuardando] = useState(false)

  const tramitesPrograma = CATALOGO_TRAMITES_SIAC.filter((item) => item.alcance === 'Programa')
  const tramitesInstitucion = CATALOGO_TRAMITES_SIAC.filter(
    (item) => item.alcance === 'Institucion',
  )
  const idResolucion = programa?.id ?? entidadId ?? 'institucion'

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    try {
      if (esInstitucion) {
        if (USAR_MOCK_PROGRAMAS_ADMIN) {
          const mockId = entidadId ?? ID_INSTITUCION_MOCK
          const [data, prog] = await Promise.all([
            obtenerProgramaMock(mockId),
            obtenerProgresoProgramaMock(mockId),
          ])
          const detalle = mapearInstitucionADetalle({
            id: data.id,
            nombre: data.nombre,
            codigo: data.codigo,
            tipoTramiteActivo:
              (data.tipoTramiteActivo as TipoTramiteSIAC) ??
              'RenovacionCondicionesInstitucionales',
            fechaResolucion: data.fechaResolucion,
            porcentajeAvance: data.porcentajeAvance,
            semaforo: data.semaforo,
            estadoProceso: data.estadoProceso,
            evidencias: data.evidencias as { estado: string }[] | undefined,
          })
          setPrograma(detalle)
          setProgreso(prog)
          setTipoTramiteActivo(detalle.tipoTramiteActivo as TipoTramiteSIAC)
        } else {
          const [data, prog] = await Promise.all([
            obtenerInstitucionApi(),
            obtenerProgresoInstitucionApi(),
          ])
          const detalle = mapearInstitucionADetalle(data)
          setPrograma(detalle)
          setProgreso(prog)
          setTipoTramiteActivo(data.tipoTramiteActivo)
        }
      } else if (!entidadId) {
        throw new Error('Identificador de programa requerido.')
      } else if (USAR_MOCK_PROGRAMAS_ADMIN) {
        const [data, prog] = await Promise.all([
          obtenerProgramaMock(entidadId),
          obtenerProgresoProgramaMock(entidadId),
        ])
        setPrograma(data)
        setProgreso(prog)
        setNombre(data.nombre)
        setFacultad(data.facultad ?? '')
        setNivel(data.nivel)
        setTipoTramiteActivo(
          (data.tipoTramiteActivo as TipoTramiteSIAC) ?? 'RenovacionRegistroCalificado',
        )
      } else {
        const data = await obtenerProgramaApi(entidadId)
        const prog = await obtenerProgresoProgramaApi(entidadId)
        const programaCargado = data as ProgramaDetalle
        setPrograma({
          ...programaCargado,
          fechaResolucion: normalizarFechaResolucion(programaCargado.fechaResolucion),
        })
        setProgreso(prog)
        setNombre(programaCargado.nombre)
        setFacultad(programaCargado.facultad ?? '')
        setNivel(programaCargado.nivel)
        setTipoTramiteActivo(
          (programaCargado.tipoTramiteActivo as TipoTramiteSIAC) ??
            'RenovacionRegistroCalificado',
        )
      }
      setErrorCarga(null)
    } catch (err) {
      setPrograma(null)
      setProgreso(null)
      setErrorCarga(err instanceof Error ? err.message : 'No se pudo cargar.')
    } finally {
      setCargando(false)
    }
  }, [entidadId, esInstitucion])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  useEffect(() => {
    if (!programa?.fechaResolucion) return
    const alerta = mensajeAlertaVigencia(programa.fechaResolucion, programa.nombre)
    const semaforo = calcularSemaforoVigencia(programa.fechaResolucion)
    if (alerta && (semaforo === 'Amarillo' || semaforo === 'Rojo')) {
      toast.warning(alerta, { id: `vigencia-${idResolucion}` })
    }
  }, [programa?.fechaResolucion, programa?.nombre, idResolucion])

  const conteos = programa?.conteosEstado
    ? {
        validadas: programa.conteosEstado.validado + (programa.conteosEstado.cumple ?? 0),
        enRevision: programa.conteosEstado.enRevision,
        rechazadas:
          programa.conteosEstado.rechazado + (programa.conteosEstado.conObservaciones ?? 0),
        anexosProximos: (programa.anexos ?? []).filter((a) => a.estado === 'Proximo').length,
      }
    : {
        validadas: 0,
        enRevision: 0,
        rechazadas: 0,
        anexosProximos: 0,
      }

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>
  }

  if (!programa || !progreso) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">
          {errorCarga ?? (esInstitucion ? 'Institución no encontrada.' : 'Programa no encontrado.')}
        </p>
        <Link href="/administrador/programas">
          <Button variant="outline">Volver</Button>
        </Link>
      </div>
    )
  }

  const vigenciaActiva = Boolean(programa.fechaResolucion)
  const puedeActivarVigencia =
    puedeAdministrar && progreso.avanceGlobal >= 100 && !vigenciaActiva
  const avanceMostrado = progreso.avanceGlobal

  async function manejarActivarVigencia() {
    setGuardando(true)
    try {
      if (esInstitucion) {
        if (USAR_MOCK_PROGRAMAS_ADMIN) {
          await activarVigenciaMock(entidadId ?? ID_INSTITUCION_MOCK)
        } else {
          await activarVigenciaInstitucionApi()
        }
      } else if (entidadId) {
        if (USAR_MOCK_PROGRAMAS_ADMIN) {
          await activarVigenciaMock(entidadId)
        } else {
          await activarVigenciaProgramaApi(entidadId)
        }
      }
      toast.success('Vigencia de registro activada.')
      await cargarDatos()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo activar.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta={esInstitucion ? 'Institución · CUAC' : 'Acreditación por carrera'}
        titulo={programa.nombre}
        descripcion={
          esInstitucion
            ? `${programa.codigo} · Condiciones institucionales (G3 + G4)`
            : `${programa.codigo}${programa.slug ? ` · ${programa.slug}` : ''} · ${programa.nivel}${programa.facultad ? ` · ${programa.facultad}` : ''}${programa.activo === false ? ' · Inactivo' : ''}`
        }
        accion={
          <Link href="/administrador/programas">
            <Button variant="outline">Volver al catálogo</Button>
          </Link>
        }
      />

      <ProcesoProgramaDetalle
        nombreEntidad={programa.nombre}
        progreso={progreso}
        vigenciaActiva={vigenciaActiva}
      />

      {vigenciaActiva && programa.fechaResolucion ? (
        <BarraVigenciaRegistro
          fechaResolucion={programa.fechaResolucion}
          nombreEntidad={programa.nombre}
        />
      ) : null}

      {puedeActivarVigencia ? (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              El proceso documental está completo. Active la vigencia de registro para iniciar el
              conteo de 7 años.
            </p>
            <Button disabled={guardando} onClick={manejarActivarVigencia}>
              Activar vigencia de registro
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {esInstitucion ? 'Avance institucional' : 'Avance de acreditación'}
            </span>
            <span className="font-semibold text-esmeralda">{avanceMostrado}%</span>
          </div>
          <Progress value={avanceMostrado} className="h-3" />
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
        {!esInstitucion ? (
          <TarjetaKpi titulo="Docs por vencer" valor={String(conteos.anexosProximos)} />
        ) : (
          <TarjetaKpi
            titulo="Documentos del trámite"
            valor={`${progreso.documentosAceptados}/${progreso.documentosTotal}`}
          />
        )}
      </div>

      {puedeAdministrar && esInstitucion ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="font-semibold text-primary">Configurar proceso institucional</p>
            <div className="space-y-2">
              <Label htmlFor="editar-tramite-institucion">Tipo de trámite SIAC</Label>
              <select
                id="editar-tramite-institucion"
                value={tipoTramiteActivo}
                onChange={(e) => setTipoTramiteActivo(e.target.value as TipoTramiteSIAC)}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              >
                {tramitesInstitucion.map((tramite) => (
                  <option key={tramite.tipo} value={tramite.tipo}>
                    {tramite.nombre} ({tramite.documentosGuia.join(' + ')})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Define si el proceso exige solo G3 o la renovación G3 + G4.
              </p>
            </div>
            <Button
              disabled={guardando}
              onClick={async () => {
                setGuardando(true)
                try {
                  if (USAR_MOCK_PROGRAMAS_ADMIN) {
                    await actualizarProgramaMock(entidadId ?? ID_INSTITUCION_MOCK, {
                      tipoTramiteActivo,
                    })
                  } else {
                    await actualizarInstitucionApi({ tipoTramiteActivo })
                  }
                  toast.success('Trámite institucional actualizado.')
                  await cargarDatos()
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'No se pudo actualizar.')
                } finally {
                  setGuardando(false)
                }
              }}
            >
              {guardando ? 'Guardando…' : 'Guardar trámite'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {puedeAdministrar && !esInstitucion ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="font-semibold text-primary">Editar programa</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="editar-nombre">Nombre</Label>
                <Input
                  id="editar-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
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
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="editar-tramite">Tipo de trámite SIAC</Label>
                <select
                  id="editar-tramite"
                  value={tipoTramiteActivo}
                  onChange={(e) => setTipoTramiteActivo(e.target.value as TipoTramiteSIAC)}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                >
                  {tramitesPrograma.map((tramite) => (
                    <option key={tramite.tipo} value={tramite.tipo}>
                      {tramite.nombre} ({tramite.documentosGuia.join(' + ')})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Define qué documentos guía (G1–G4) exige el proceso de acreditación de este
                  programa.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                disabled={guardando || !nombre.trim()}
                onClick={async () => {
                  setGuardando(true)
                  try {
                    const datosActualizacion = {
                      nombre: nombre.trim(),
                      facultad: facultad.trim(),
                      nivel,
                      tipoTramiteActivo,
                    }
                    const actualizado = USAR_MOCK_PROGRAMAS_ADMIN
                      ? await actualizarProgramaMock(entidadId!, datosActualizacion)
                      : await actualizarProgramaApi(entidadId!, datosActualizacion)
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
                    const actualizado = USAR_MOCK_PROGRAMAS_ADMIN
                      ? await actualizarEstadoProgramaMock(entidadId!, activo)
                      : await actualizarEstadoProgramaApi(entidadId!, activo)
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

      {esInstitucion ? (
        <div className="flex flex-wrap gap-3">
          <Link href="/administrador/busqueda?codigoGuia=G3">
            <Button>Ver evidencias G3</Button>
          </Link>
          {progreso.documentos.some((doc) => doc.codigoGuia === 'G4') ? (
            <Link href="/administrador/busqueda?codigoGuia=G4">
              <Button variant="outline">Ver evidencias G4</Button>
            </Link>
          ) : null}
          <Link href="/administrador/plantillas">
            <Button variant="outline">Plantillas compartidas</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Link href={`/administrador/busqueda?programa=${programa.slug ?? programa.id}`}>
            <Button>Ver evidencias de este programa</Button>
          </Link>
          <Link href="/administrador/plantillas">
            <Button variant="outline">Plantillas compartidas</Button>
          </Link>
          <Link href={`/administrador/vigencias?programaId=${programa.id}`}>
            <Button variant="outline">Vigencias del programa</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
