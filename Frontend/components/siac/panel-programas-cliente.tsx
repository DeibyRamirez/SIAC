'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { usarSesion } from '@/components/auth/proveedor-sesion'
import { BarraHerramientasTabla } from '@/components/siac/barra-herramientas-tabla'
import { ControlesPaginacion } from '@/components/siac/controles-paginacion'
import { OpcionFiltroSemaforo } from '@/components/siac/opcion-filtro-semaforo'
import { DialogoCrearPrograma } from '@/components/siac/dialogo-crear-programa'
import { RejillaProgramas, type ProgramaRejilla } from '@/components/siac/rejilla-programas'
import { TarjetaInstitucionPanel } from '@/components/siac/tarjeta-institucion-panel'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LIMITE_FILAS_TABLA } from '@/lib/constantes/paginacion'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { sincronizarCarrerasApi } from '@/lib/servicios/integracion.servicio'
import type {
  EstadoFiltroPanel,
  FilaPanelPrograma,
  RespuestaPanelProgramas,
} from '@/lib/servicios/panel-programas.servicio'
import { manejarCambioSelect } from '@/lib/utilidades-siac'
import { OPCIONES_FILTRO_SEMAFORO_PANEL } from '@/lib/utilidades/etiquetas-semaforo'
import { construirUrlPanel, type FiltrosPanelUrl } from '@/lib/utilidades/parametros-panel-url'

const CLAVE_SYNC_CARRERAS_SESION = 'siac-sync-carreras-realizado'
const ESPERA_BUSQUEDA_MS = 400

function syncCarrerasYaRealizadoEnSesion(): boolean {
  try {
    return sessionStorage.getItem(CLAVE_SYNC_CARRERAS_SESION) === '1'
  } catch {
    return false
  }
}

function marcarSyncCarrerasEnSesion(marcar: boolean): void {
  try {
    if (marcar) sessionStorage.setItem(CLAVE_SYNC_CARRERAS_SESION, '1')
    else sessionStorage.removeItem(CLAVE_SYNC_CARRERAS_SESION)
  } catch {
    /* quota o modo privado */
  }
}

export function mapearFilasPanel(datos: FilaPanelPrograma[]): ProgramaRejilla[] {
  return datos.map((fila) => ({
    ...fila,
    porcentajeAvance: fila.avancePorcentual,
    semaforo: fila.semaforoGeneral,
    activo: fila.activo ?? true,
    urlImagen: fila.urlImagen ?? undefined,
    estadoProceso: fila.anexoInfraestructuraVencido
      ? 'Anexo infraestructura vencido (RN-003)'
      : fila.avancePorcentual >= 100
        ? 'Completado'
        : 'En progreso',
  }))
}

interface PanelProgramasClienteProps {
  filtros: FiltrosPanelUrl
  datos: RespuestaPanelProgramas
  institucion: FilaPanelPrograma | null
  errorCarga: string | null
}

/**
 * Parte interactiva del panel (R-010.3a). Los datos llegan ya renderizados desde el servidor;
 * cambiar un filtro solo actualiza la URL y Next vuelve a pedir la página al servidor.
 */
export function PanelProgramasCliente({ filtros, datos, institucion, errorCarga }: PanelProgramasClienteProps) {
  const router = useRouter()
  const { sesion } = usarSesion()
  const puedeAdministrar = sesion?.rol === 'Administrador' || sesion?.rol === 'SuperAdmin'
  const [cargando, iniciarTransicion] = useTransition()
  const [busqueda, setBusqueda] = useState(filtros.q)
  const [semestre, setSemestre] = useState(filtros.semestre)
  const [sincronizando, setSincronizando] = useState(false)
  const [dialogoCrearAbierto, setDialogoCrearAbierto] = useState(false)
  const sincronizandoRef = useRef(false)

  const navegar = useCallback(
    (cambios: Partial<FiltrosPanelUrl>) => {
      const siguiente = { ...filtros, pagina: 1, ...cambios }
      iniciarTransicion(() => router.replace(construirUrlPanel(siguiente), { scroll: false }))
    },
    [filtros, router],
  )

  useEffect(() => {
    if (busqueda.trim() === filtros.q && semestre.trim() === filtros.semestre) return
    const temporizador = setTimeout(
      () => navegar({ q: busqueda.trim(), semestre: semestre.trim() }),
      ESPERA_BUSQUEDA_MS,
    )
    return () => clearTimeout(temporizador)
  }, [busqueda, semestre, filtros.q, filtros.semestre, navegar])

  const sincronizarCatalogo = useCallback(
    async (forzar: boolean) => {
      if (!puedeAdministrar || !apiDisponible() || sincronizandoRef.current) return
      if (!forzar && syncCarrerasYaRealizadoEnSesion()) return
      sincronizandoRef.current = true
      setSincronizando(true)
      try {
        const resultado = await sincronizarCarrerasApi()
        marcarSyncCarrerasEnSesion(true)
        const huboCambios =
          resultado.importados > 0 || resultado.actualizados > 0 || resultado.desactivados > 0
        if (forzar || huboCambios) {
          const partes = [
            `${resultado.importados} importada(s)`,
            `${resultado.actualizados} actualizada(s)`,
            `${resultado.totalEnBd} en base de datos`,
          ]
          if (resultado.desactivados > 0) partes.push(`${resultado.desactivados} desactivada(s)`)
          toast.success(`Catálogo guardado: ${partes.join(', ')}.`)
        }
        if (huboCambios) router.refresh()
      } catch (err) {
        marcarSyncCarrerasEnSesion(false)
        toast.warning(
          err instanceof Error
            ? err.message
            : 'No se pudo sincronizar el catálogo de carreras. Se muestra la última copia local.',
        )
      } finally {
        sincronizandoRef.current = false
        setSincronizando(false)
      }
    },
    [puedeAdministrar, router],
  )

  useEffect(() => {
    void sincronizarCatalogo(datos.total === 0)
    // Solo al montar: la sincronización del catálogo se hace una vez por sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeAdministrar])

  const filas = mapearFilasPanel(datos.datos)

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Planeación · Panel consolidado"
        titulo="Programas e institución"
        descripcion="Catálogo de carreras desde la universidad. El avance SIAC (G1–G4, semáforos y vigencia) se gestiona en cada programa."
        accion={
          puedeAdministrar ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setDialogoCrearAbierto(true)}>Crear programa</Button>
              <Button
                variant="outline"
                disabled={sincronizando}
                onClick={() => void sincronizarCatalogo(true)}
              >
                {sincronizando ? 'Sincronizando…' : 'Actualizar catálogo'}
              </Button>
            </div>
          ) : undefined
        }
      />
      {puedeAdministrar ? (
        <DialogoCrearPrograma
          abierto={dialogoCrearAbierto}
          onCerrar={() => setDialogoCrearAbierto(false)}
          onCreado={(nombreCreado) => {
            const tramiteActual = filtros.tramite
            const ocultoPorTramite =
              tramiteActual &&
              tramiteActual !== 'todos' &&
              tramiteActual !== 'RegistroCalificadoNuevo'
            navegar({
              tramite: ocultoPorTramite ? 'todos' : tramiteActual,
              q: nombreCreado,
              pagina: 1,
            })
            router.refresh()
          }}
        />
      ) : null}
      {errorCarga ? <p className="text-sm text-destructive">{errorCarga}</p> : null}

      {institucion ? <TarjetaInstitucionPanel institucion={institucion} /> : null}

      <div className="space-y-4" aria-busy={cargando}>
        <h2 className="text-lg font-semibold text-primary">Programas académicos</h2>

        <BarraHerramientasTabla placeholder="Buscar por nombre o código…" valorBusqueda={busqueda} onBuscar={setBusqueda}>
          <Select
            value={filtros.estado}
            onValueChange={manejarCambioSelect((valor) => navegar({ estado: valor as EstadoFiltroPanel }))}
          >
            <SelectTrigger className="w-[140px]" aria-label="Filtrar por estado">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activos">Activos</SelectItem>
              <SelectItem value="inactivos">Inactivos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtros.tramite} onValueChange={manejarCambioSelect((valor) => navegar({ tramite: valor }))}>
            <SelectTrigger className="w-[200px]" aria-label="Filtrar por trámite">
              <SelectValue placeholder="Trámite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los trámites</SelectItem>
              <SelectItem value="RegistroCalificadoNuevo">RC nuevo (G1)</SelectItem>
              <SelectItem value="RenovacionRegistroCalificado">Renovación RC (G1+G2)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtros.semaforo} onValueChange={manejarCambioSelect((valor) => navegar({ semaforo: valor }))}>
            <SelectTrigger className="w-[140px]" aria-label="Filtrar por semáforo">
              <SelectValue placeholder="Semáforo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {OPCIONES_FILTRO_SEMAFORO_PANEL.map((opcion) => (
                <SelectItem key={opcion.valor} value={opcion.valor}>
                  <OpcionFiltroSemaforo valor={opcion.valor} contexto={opcion.contexto} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Semestre (ej. 2026-1)"
            aria-label="Filtrar por semestre"
            value={semestre}
            onChange={(e) => setSemestre(e.target.value)}
            className="w-[140px]"
          />
        </BarraHerramientasTabla>

        <RejillaProgramas programas={filas} enlaceDetalle={(id) => `/administrador/programas/${id}`} />
        {datos.total > 0 && (
          <ControlesPaginacion
            pagina={filtros.pagina}
            limite={LIMITE_FILAS_TABLA}
            total={datos.total}
            onCambiarPagina={(pagina) => navegar({ pagina })}
          />
        )}
      </div>
    </div>
  )
}
