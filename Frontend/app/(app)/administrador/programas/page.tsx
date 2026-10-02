'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { BarraHerramientasTabla } from '@/components/siac/barra-herramientas-tabla'
import { ControlesPaginacion } from '@/components/siac/controles-paginacion'
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
import { ROLES_CONSULTA_INSTITUCIONAL } from '@/lib/auth-mock'
import {
  USAR_MOCK_INSTITUCION,
  USAR_MOCK_PROGRAMAS_ADMIN,
} from '@/lib/config-programas-admin'
import { LIMITE_FILAS_TABLA } from '@/lib/constantes/paginacion'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { sincronizarCarrerasApi } from '@/lib/servicios/integracion.servicio'
import {
  listarPanelProgramasApi,
  type EstadoFiltroPanel,
  type FilaPanelPrograma,
} from '@/lib/servicios/panel-programas.servicio'
import {
  listarPanelProgramasMock,
  obtenerInstitucionMock,
  type FiltroEstadoPrograma,
} from '@/lib/servicios/programas-admin.mock.servicio'
import type { SemaforoPrograma } from '@/lib/tipos'
import type { TipoTramiteSIAC } from '@/lib/utilidades/catalogo-tramites-siac'
import { manejarCambioSelect } from '@/lib/utilidades-siac'

const CLAVE_SYNC_CARRERAS_SESION = 'siac-sync-carreras-realizado'

function syncCarrerasYaRealizadoEnSesion(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(CLAVE_SYNC_CARRERAS_SESION) === '1'
  } catch {
    return false
  }
}

function marcarSyncCarrerasEnSesion(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CLAVE_SYNC_CARRERAS_SESION, '1')
  } catch {
    /* quota o modo privado */
  }
}

function limpiarMarcaSyncCarrerasEnSesion(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(CLAVE_SYNC_CARRERAS_SESION)
  } catch {
    /* quota o modo privado */
  }
}

export default function ProgramasAdministradorPage() {
  return (
    <PlantillaPaginaApp titulo="Programas académicos" roles={ROLES_CONSULTA_INSTITUCIONAL}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando panel…</p>}>
        <ContenidoProgramas />
      </Suspense>
    </PlantillaPaginaApp>
  )
}

function mapearFilasPanel(
  datos: FilaPanelPrograma[],
  busqueda: string,
): ProgramaRejilla[] {
  return datos
    .filter((fila) => {
      if (!busqueda.trim()) return true
      const texto = busqueda.toLowerCase()
      return (
        fila.nombre.toLowerCase().includes(texto) ||
        (fila.codigo?.toLowerCase().includes(texto) ?? false)
      )
    })
    .map((fila) => ({
      ...fila,
      porcentajeAvance: fila.avancePorcentual,
      semaforo: fila.semaforoGeneral,
      activo: fila.activo ?? true,
      urlImagen: fila.urlImagen ?? undefined,
      estadoProceso:
        fila.anexoInfraestructuraVencido
          ? 'Anexo infraestructura vencido (RN-003)'
          : fila.avancePorcentual >= 100
            ? 'Completado'
            : 'En progreso',
    }))
}

function ContenidoProgramas() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { sesion } = usarSesion()
  const puedeAdministrar = sesion?.rol === 'Administrador' || sesion?.rol === 'SuperAdmin'
  const sincronizandoRef = useRef(false)

  const [busqueda, setBusqueda] = useState(() => searchParams.get('q') ?? '')
  const [estado, setEstado] = useState<FiltroEstadoPrograma>(
    () => (searchParams.get('estado') as FiltroEstadoPrograma) || 'activos',
  )
  const [tramite, setTramite] = useState<string>(() => searchParams.get('tramite') ?? 'todos')
  const [semaforo, setSemaforo] = useState<string>(() => searchParams.get('semaforo') ?? 'todos')
  const [semestre, setSemestre] = useState(() => searchParams.get('semestre') ?? '')
  const [pagina, setPagina] = useState(() => Number(searchParams.get('pagina') ?? '1') || 1)
  const [institucion, setInstitucion] = useState<FilaPanelPrograma | null>(null)
  const [filas, setFilas] = useState<ProgramaRejilla[]>([])
  const [total, setTotal] = useState(0)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [sincronizando, setSincronizando] = useState(false)

  const cargarInstitucion = useCallback(async () => {
    if (USAR_MOCK_INSTITUCION) {
      const inst = await obtenerInstitucionMock()
      setInstitucion(inst)
      return
    }
    const respuesta = await listarPanelProgramasApi({
      alcance: 'Institucion',
      limit: 1,
    })
    setInstitucion(respuesta.datos[0] ?? null)
  }, [])

  const sincronizarCatalogo = useCallback(
    async (forzar = false) => {
      if (USAR_MOCK_PROGRAMAS_ADMIN || !puedeAdministrar || !apiDisponible()) return null
      if (!forzar && (syncCarrerasYaRealizadoEnSesion() || sincronizandoRef.current)) return null

      sincronizandoRef.current = true
      setSincronizando(true)
      try {
        const resultado = await sincronizarCarrerasApi()
        marcarSyncCarrerasEnSesion()
        if (
          forzar ||
          resultado.importados > 0 ||
          resultado.actualizados > 0 ||
          resultado.desactivados > 0
        ) {
          const partes = [
            `${resultado.importados} importada(s)`,
            `${resultado.actualizados} actualizada(s)`,
            `${resultado.totalEnBd} en base de datos`,
          ]
          if (resultado.desactivados > 0) {
            partes.push(`${resultado.desactivados} desactivada(s)`)
          }
          toast.success(`Catálogo guardado: ${partes.join(', ')}.`)
        }
        return resultado
      } catch (err) {
        limpiarMarcaSyncCarrerasEnSesion()
        toast.warning(
          err instanceof Error
            ? err.message
            : 'No se pudo sincronizar el catálogo de carreras. Se muestra la última copia local.',
        )
        return null
      } finally {
        sincronizandoRef.current = false
        setSincronizando(false)
      }
    },
    [puedeAdministrar],
  )

  const cargarPanel = useCallback(async () => {
    if (!USAR_MOCK_PROGRAMAS_ADMIN && !apiDisponible()) {
      setErrorCarga('No hay conexión con la API.')
      return
    }

    try {
      await sincronizarCatalogo()
      await cargarInstitucion()

      const consultarPanel = async () => {
        if (USAR_MOCK_PROGRAMAS_ADMIN) {
          return listarPanelProgramasMock({
            page: pagina,
            limit: LIMITE_FILAS_TABLA,
            tramite: tramite === 'todos' ? undefined : (tramite as TipoTramiteSIAC),
            semaforo: semaforo === 'todos' ? undefined : (semaforo as SemaforoPrograma),
            estado,
            busqueda,
          })
        }

        return listarPanelProgramasApi({
          page: pagina,
          limit: LIMITE_FILAS_TABLA,
          tramite: tramite === 'todos' ? undefined : (tramite as TipoTramiteSIAC),
          semaforo: semaforo === 'todos' ? undefined : (semaforo as SemaforoPrograma),
          semestre: semestre.trim() || undefined,
          estado: estado as EstadoFiltroPanel,
          origen: 'API',
        })
      }

      let respuesta = await consultarPanel()

      if (!USAR_MOCK_PROGRAMAS_ADMIN && respuesta.total === 0 && puedeAdministrar) {
        await sincronizarCatalogo(true)
        respuesta = await consultarPanel()
      }

      setFilas(mapearFilasPanel(respuesta.datos, busqueda))
      setTotal(respuesta.total)
      setErrorCarga(null)
    } catch (err) {
      setFilas([])
      setTotal(0)
      setErrorCarga(err instanceof Error ? err.message : 'No se pudo cargar el panel.')
    }
  }, [
    pagina,
    tramite,
    semaforo,
    semestre,
    busqueda,
    estado,
    puedeAdministrar,
    sincronizarCatalogo,
    cargarInstitucion,
  ])

  useEffect(() => {
    cargarPanel()
  }, [cargarPanel])

  useEffect(() => {
    setPagina(1)
  }, [tramite, semaforo, semestre, busqueda, estado])

  useEffect(() => {
    const params = new URLSearchParams()
    if (busqueda.trim()) params.set('q', busqueda.trim())
    if (estado !== 'activos') params.set('estado', estado)
    if (tramite !== 'todos') params.set('tramite', tramite)
    if (semaforo !== 'todos') params.set('semaforo', semaforo)
    if (semestre.trim()) params.set('semestre', semestre.trim())
    if (pagina > 1) params.set('pagina', String(pagina))
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [busqueda, estado, tramite, semaforo, semestre, pagina, pathname, router])

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Planeación · Panel consolidado"
        titulo="Programas e institución"
        descripcion="Catálogo de carreras desde la universidad. El avance SIAC (G1–G4, semáforos y vigencia) se gestiona en cada programa."
        accion={
          puedeAdministrar && !USAR_MOCK_PROGRAMAS_ADMIN ? (
            <Button
              variant="outline"
              disabled={sincronizando}
              onClick={async () => {
                limpiarMarcaSyncCarrerasEnSesion()
                await sincronizarCatalogo(true)
                await cargarPanel()
              }}
            >
              {sincronizando ? 'Sincronizando…' : 'Actualizar catálogo'}
            </Button>
          ) : undefined
        }
      />
      {errorCarga ? <p className="text-sm text-destructive">{errorCarga}</p> : null}

      {institucion ? <TarjetaInstitucionPanel institucion={institucion} /> : null}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-primary">Programas académicos</h2>

        <BarraHerramientasTabla
          placeholder="Buscar…"
          valorBusqueda={busqueda}
          onBuscar={setBusqueda}
        >
          <Select
            value={estado}
            onValueChange={manejarCambioSelect((valor) => setEstado(valor as FiltroEstadoPrograma))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activos">Activos</SelectItem>
              <SelectItem value="inactivos">Inactivos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tramite} onValueChange={manejarCambioSelect(setTramite)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Trámite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los trámites</SelectItem>
              <SelectItem value="RegistroCalificadoNuevo">RC nuevo (G1)</SelectItem>
              <SelectItem value="RenovacionRegistroCalificado">Renovación RC (G1+G2)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={semaforo} onValueChange={manejarCambioSelect(setSemaforo)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Semáforo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Verde">Verde</SelectItem>
              <SelectItem value="Amarillo">Amarillo</SelectItem>
              <SelectItem value="Rojo">Rojo</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Semestre (ej. 2026-1)"
            value={semestre}
            onChange={(e) => setSemestre(e.target.value)}
            className="w-[140px]"
          />
        </BarraHerramientasTabla>

        <RejillaProgramas
          programas={filas}
          enlaceDetalle={(id) => `/administrador/programas/${id}`}
        />
        {total > 0 && (
          <ControlesPaginacion
            pagina={pagina}
            limite={LIMITE_FILAS_TABLA}
            total={total}
            onCambiarPagina={setPagina}
          />
        )}
      </div>
    </div>
  )
}
