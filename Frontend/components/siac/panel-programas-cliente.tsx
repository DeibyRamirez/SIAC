'use client'

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
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
  MetadatosCatalogoCuacPanel,
  RespuestaPanelProgramas,
} from '@/lib/servicios/panel-programas.servicio'
import { manejarCambioSelect } from '@/lib/utilidades-siac'
import { OPCIONES_FILTRO_SEMAFORO_PANEL } from '@/lib/utilidades/etiquetas-semaforo'
import { construirUrlPanel, type FiltrosPanelUrl } from '@/lib/utilidades/parametros-panel-url'

const OPCION_TODOS = 'todos'

function etiquetaEstadoProgramas(valor: EstadoFiltroPanel): string {
  if (valor === 'activos') return 'activos'
  if (valor === 'inactivos') return 'inactivos'
  return 'todos'
}

function etiquetaTramite(valor: string): string {
  if (valor === 'RegistroCalificadoNuevo') return 'RC nuevo (G1)'
  if (valor === 'RenovacionRegistroCalificado') return 'Renovación RC (G1+G2)'
  return 'todos los trámites'
}

function FiltroConEtiqueta({
  etiqueta,
  id,
  children,
}: {
  etiqueta: string
  id: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={id} className="whitespace-nowrap text-xs font-medium text-muted-foreground">
        {etiqueta}
      </label>
      {children}
    </div>
  )
}

const ESPERA_BUSQUEDA_MS = 400

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

  const sincronizarCatalogo = useCallback(async () => {
    if (!puedeAdministrar || !apiDisponible() || sincronizandoRef.current) return
    sincronizandoRef.current = true
    setSincronizando(true)
    try {
      const resultado = await sincronizarCarrerasApi()
      const partes = [
        `${resultado.importados} importada(s)`,
        `${resultado.actualizados} actualizada(s)`,
        `${resultado.totalEnBd} en base de datos`,
      ]
      if (resultado.desactivados > 0) partes.push(`${resultado.desactivados} desactivada(s)`)
      toast.success(`Catálogo actualizado: ${partes.join(', ')}.`)
      router.refresh()
    } catch (err) {
      toast.warning(
        err instanceof Error
          ? err.message
          : 'No se pudo sincronizar el catálogo de carreras. Se muestra la última copia local.',
      )
    } finally {
      sincronizandoRef.current = false
      setSincronizando(false)
    }
  }, [puedeAdministrar, router])

  const filas = mapearFilasPanel(datos.datos)
  const catalogo: MetadatosCatalogoCuacPanel | undefined = datos.catalogoCuac
  const periodoCatalogo = catalogo?.version ?? '—'

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
                onClick={() => void sincronizarCatalogo()}
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
          <FiltroConEtiqueta etiqueta="Estado programas" id="filtro-estado-programas">
            <Select
              value={filtros.estado}
              onValueChange={manejarCambioSelect((valor) => navegar({ estado: valor as EstadoFiltroPanel }))}
            >
              <SelectTrigger id="filtro-estado-programas" className="w-[130px]">
                <SelectValue>{etiquetaEstadoProgramas(filtros.estado)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activos">Activos</SelectItem>
                <SelectItem value="inactivos">Inactivos</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </FiltroConEtiqueta>

          <FiltroConEtiqueta etiqueta="Trámites" id="filtro-tramite">
            <Select
              value={filtros.tramite}
              onValueChange={manejarCambioSelect((valor) => navegar({ tramite: valor }))}
            >
              <SelectTrigger id="filtro-tramite" className="w-[190px]">
                <SelectValue>{etiquetaTramite(filtros.tramite)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los trámites</SelectItem>
                <SelectItem value="RegistroCalificadoNuevo">RC nuevo (G1)</SelectItem>
                <SelectItem value="RenovacionRegistroCalificado">Renovación RC (G1+G2)</SelectItem>
              </SelectContent>
            </Select>
          </FiltroConEtiqueta>

          <FiltroConEtiqueta etiqueta="Estado del avance" id="filtro-semaforo">
            <Select
              value={filtros.semaforo}
              onValueChange={manejarCambioSelect((valor) => navegar({ semaforo: valor }))}
            >
              <SelectTrigger id="filtro-semaforo" className="w-[150px]">
                <SelectValue placeholder="Todos" />
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
          </FiltroConEtiqueta>

          <FiltroConEtiqueta etiqueta="Periodo evidencias" id="filtro-semestre">
            <Input
              id="filtro-semestre"
              placeholder="2026-2"
              value={semestre}
              onChange={(e) => setSemestre(e.target.value)}
              className="w-[100px]"
            />
          </FiltroConEtiqueta>

          <FiltroConEtiqueta etiqueta="Periodo catálogo" id="filtro-periodo-catalogo">
            <span
              id="filtro-periodo-catalogo"
              className="inline-flex h-9 min-w-[88px] items-center rounded-md border border-input bg-muted/40 px-3 text-xs font-semibold text-primary"
            >
              {periodoCatalogo}
            </span>
          </FiltroConEtiqueta>

          {catalogo && catalogo.niveles.length > 0 ? (
            <FiltroConEtiqueta etiqueta="Nivel" id="filtro-nivel">
              <Select
                value={filtros.nivel || OPCION_TODOS}
                onValueChange={manejarCambioSelect((valor) =>
                  navegar({ nivel: valor === OPCION_TODOS ? '' : valor }),
                )}
              >
                <SelectTrigger id="filtro-nivel" className="w-[130px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OPCION_TODOS}>Todos</SelectItem>
                  {catalogo.niveles.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FiltroConEtiqueta>
          ) : null}

          {catalogo && catalogo.facultades.length > 0 ? (
            <FiltroConEtiqueta etiqueta="Facultad" id="filtro-facultad">
              <Select
                value={filtros.facultad || OPCION_TODOS}
                onValueChange={manejarCambioSelect((valor) =>
                  navegar({ facultad: valor === OPCION_TODOS ? '' : valor }),
                )}
              >
                <SelectTrigger id="filtro-facultad" className="max-w-[220px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OPCION_TODOS}>Todas</SelectItem>
                  {catalogo.facultades.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FiltroConEtiqueta>
          ) : null}

          {catalogo && catalogo.modalidades.length > 0 ? (
            <FiltroConEtiqueta etiqueta="Modalidad" id="filtro-modalidad">
              <Select
                value={filtros.modalidad || OPCION_TODOS}
                onValueChange={manejarCambioSelect((valor) =>
                  navegar({ modalidad: valor === OPCION_TODOS ? '' : valor }),
                )}
              >
                <SelectTrigger id="filtro-modalidad" className="w-[130px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OPCION_TODOS}>Todas</SelectItem>
                  {catalogo.modalidades.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FiltroConEtiqueta>
          ) : null}
        </BarraHerramientasTabla>

        {catalogo?.revalidando ? (
          <p className="text-xs text-muted-foreground" role="status">
            Actualizando catálogo…
          </p>
        ) : null}

        {catalogo?.degradado ? (
          <p className="text-xs text-ocre" role="status">
            Catálogo CUAC no disponible en este momento; se muestran los datos locales de SIAC.
          </p>
        ) : null}

        <RejillaProgramas
          programas={filas}
          cargando={cargando && filas.length === 0}
          enlaceDetalle={(id) => `/administrador/programas/${id}`}
        />
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
