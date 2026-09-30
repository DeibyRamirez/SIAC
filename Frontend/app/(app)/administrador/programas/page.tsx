'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { BarraHerramientasTabla } from '@/components/siac/barra-herramientas-tabla'
import { ControlesPaginacion } from '@/components/siac/controles-paginacion'
import { RejillaProgramas, type ProgramaRejilla } from '@/components/siac/rejilla-programas'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ROLES_CONSULTA_INSTITUCIONAL } from '@/lib/auth-mock'
import { LIMITE_FILAS_TABLA } from '@/lib/constantes/paginacion'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { listarPanelProgramasApi } from '@/lib/servicios/panel-programas.servicio'
import { crearProgramaApi } from '@/lib/servicios/programas.servicio'
import type { NivelPrograma, SemaforoPrograma } from '@/lib/tipos'
import type { AlcanceTramiteUI, TipoTramiteSIAC } from '@/lib/utilidades/catalogo-tramites-siac'
import { manejarCambioSelect } from '@/lib/utilidades-siac'

export default function ProgramasAdministradorPage() {
  return (
    <PlantillaPaginaApp titulo="Programas académicos" roles={ROLES_CONSULTA_INSTITUCIONAL}>
      <ContenidoProgramas />
    </PlantillaPaginaApp>
  )
}

function ContenidoProgramas() {
  const { sesion } = usarSesion()
  const puedeAdministrar = sesion?.rol === 'Administrador' || sesion?.rol === 'SuperAdmin'
  const [busqueda, setBusqueda] = useState('')
  const [alcance, setAlcance] = useState<AlcanceTramiteUI>('Programa')
  const [tramite, setTramite] = useState<string>('todos')
  const [semaforo, setSemaforo] = useState<string>('todos')
  const [semestre, setSemestre] = useState('')
  const [pagina, setPagina] = useState(1)
  const [filas, setFilas] = useState<ProgramaRejilla[]>([])
  const [total, setTotal] = useState(0)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [facultadNueva, setFacultadNueva] = useState('')
  const [nivelNuevo, setNivelNuevo] = useState<NivelPrograma>('Pregrado')
  const [guardando, setGuardando] = useState(false)

  const cargarPanel = useCallback(async () => {
    if (!apiDisponible()) {
      setErrorCarga('No hay conexión con la API.')
      return
    }
    try {
      const respuesta = await listarPanelProgramasApi({
        page: pagina,
        limit: LIMITE_FILAS_TABLA,
        alcance,
        tramite: tramite === 'todos' ? undefined : (tramite as TipoTramiteSIAC),
        semaforo: semaforo === 'todos' ? undefined : (semaforo as SemaforoPrograma),
        semestre: semestre.trim() || undefined,
      })
      const mapeadas: ProgramaRejilla[] = respuesta.datos
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
          estadoProceso:
            fila.anexoInfraestructuraVencido
              ? 'Anexo infraestructura vencido (RN-003)'
              : fila.avancePorcentual >= 100
                ? 'Completado'
                : 'En progreso',
        }))
      setFilas(mapeadas)
      setTotal(respuesta.total)
      setErrorCarga(null)
    } catch (err) {
      setFilas([])
      setTotal(0)
      setErrorCarga(err instanceof Error ? err.message : 'No se pudo cargar el panel.')
    }
  }, [pagina, alcance, tramite, semaforo, semestre, busqueda])

  useEffect(() => {
    cargarPanel()
  }, [cargarPanel])

  useEffect(() => {
    setPagina(1)
  }, [alcance, tramite, semaforo, semestre, busqueda])

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Planeación · Panel consolidado"
        titulo="Programas e institución"
        descripcion="Semáforo agregado por programa o institución (G1–G4), sin abrir carpeta por carpeta."
        accion={
          puedeAdministrar && alcance === 'Programa' ? (
            <Button onClick={() => setDialogoAbierto(true)}>Nuevo programa</Button>
          ) : undefined
        }
      />
      {errorCarga ? <p className="text-sm text-destructive">{errorCarga}</p> : null}

      <BarraHerramientasTabla
        placeholder="Buscar…"
        valorBusqueda={busqueda}
        onBuscar={setBusqueda}
      >
        <Select
          value={alcance}
          onValueChange={manejarCambioSelect((valor) => setAlcance(valor as AlcanceTramiteUI))}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Alcance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Programa">Programas</SelectItem>
            <SelectItem value="Institucion">Institución</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tramite} onValueChange={manejarCambioSelect(setTramite)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Trámite" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los trámites</SelectItem>
            <SelectItem value="RegistroCalificadoNuevo">RC nuevo</SelectItem>
            <SelectItem value="RenovacionRegistroCalificado">Renovación RC</SelectItem>
            <SelectItem value="CondicionesInstitucionalesNuevas">CI nuevas</SelectItem>
            <SelectItem value="RenovacionCondicionesInstitucionales">Renovación CI</SelectItem>
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
        enlaceDetalle={
          alcance === 'Programa' ? (id) => `/administrador/programas/${id}` : undefined
        }
      />
      {total > 0 && (
        <ControlesPaginacion
          pagina={pagina}
          limite={LIMITE_FILAS_TABLA}
          total={total}
          onCambiarPagina={setPagina}
        />
      )}

      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear programa base</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nombre-programa">Nombre del programa</Label>
              <Input
                id="nombre-programa"
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facultad-programa">Facultad</Label>
              <Input
                id="facultad-programa"
                value={facultadNueva}
                onChange={(e) => setFacultadNueva(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nivel-programa">Nivel</Label>
              <select
                id="nivel-programa"
                value={nivelNuevo}
                onChange={(e) => setNivelNuevo(e.target.value as NivelPrograma)}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              >
                <option value="Pregrado">Pregrado</option>
                <option value="Posgrado">Posgrado</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoAbierto(false)}>
              Cancelar
            </Button>
            <Button
              disabled={guardando || !nombreNuevo.trim()}
              onClick={async () => {
                setGuardando(true)
                try {
                  await crearProgramaApi({
                    nombre: nombreNuevo.trim(),
                    nivel: nivelNuevo,
                    facultad: facultadNueva.trim() || undefined,
                  })
                  toast.success('Programa creado.')
                  setNombreNuevo('')
                  setFacultadNueva('')
                  setDialogoAbierto(false)
                  await cargarPanel()
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : 'No se pudo crear el programa.',
                  )
                } finally {
                  setGuardando(false)
                }
              }}
            >
              {guardando ? 'Guardando…' : 'Crear programa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
