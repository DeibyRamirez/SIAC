'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { BarraHerramientasTabla } from '@/components/siac/barra-herramientas-tabla'
import { ControlesPaginacion } from '@/components/siac/controles-paginacion'
import { RejillaProgramas } from '@/components/siac/rejilla-programas'
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
import { crearProgramaApi, listarProgramasApi } from '@/lib/servicios/programas.servicio'
import type { NivelPrograma, Programa } from '@/lib/tipos'
import { paginarArreglo } from '@/lib/utilidades/paginacion-cliente'
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
  const [nivel, setNivel] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [programas, setProgramas] = useState<Programa[]>([])
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [facultadNueva, setFacultadNueva] = useState('')
  const [nivelNuevo, setNivelNuevo] = useState<NivelPrograma>('Pregrado')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    async function cargar() {
      if (!apiDisponible()) {
        setErrorCarga('No hay conexión con la API. No se muestran datos de prueba.')
        return
      }
      try {
        const lista = await listarProgramasApi()
        setProgramas(lista)
        setErrorCarga(null)
      } catch (err) {
        setProgramas([])
        setErrorCarga(err instanceof Error ? err.message : 'No se pudieron cargar los programas.')
      }
    }
    cargar()
  }, [])

  const programasFiltrados = useMemo(() => {
    return programas.filter((programa) => {
      const coincideTexto =
        programa.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        programa.codigo.toLowerCase().includes(busqueda.toLowerCase())
      const coincideNivel = nivel === 'todos' || programa.nivel === nivel
      return coincideTexto && coincideNivel
    })
  }, [busqueda, nivel, programas])

  const programasPagina = useMemo(
    () => paginarArreglo(programasFiltrados, pagina, LIMITE_FILAS_TABLA),
    [programasFiltrados, pagina],
  )

  useEffect(() => {
    setPagina(1)
  }, [busqueda, nivel])

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Catálogo académico"
        titulo="Programas académicos"
        descripcion={`Monitorea el avance de ${programas.length} programas en proceso de acreditación (pregrado y posgrado).`}
        accion={
          puedeAdministrar ? (
            <Button onClick={() => setDialogoAbierto(true)}>Nuevo programa</Button>
          ) : undefined
        }
      />
      {errorCarga ? <p className="text-sm text-destructive">{errorCarga}</p> : null}

      <BarraHerramientasTabla
        placeholder="Buscar programa…"
        valorBusqueda={busqueda}
        onBuscar={(valor) => {
          setBusqueda(valor)
          setPagina(1)
        }}
      >
        <Select
          value={nivel}
          onValueChange={manejarCambioSelect((valor) => {
            setNivel(valor)
            setPagina(1)
          })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Nivel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los niveles</SelectItem>
            <SelectItem value="Pregrado">Pregrado</SelectItem>
            <SelectItem value="Posgrado">Posgrado</SelectItem>
          </SelectContent>
        </Select>
      </BarraHerramientasTabla>

      <RejillaProgramas
        programas={programasPagina}
        enlaceDetalle={(id) => `/administrador/programas/${id}`}
      />
      {programasFiltrados.length > 0 && (
        <ControlesPaginacion
          pagina={pagina}
          limite={LIMITE_FILAS_TABLA}
          total={programasFiltrados.length}
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
                placeholder="Ej. Ingeniería de Software y Computación"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facultad-programa">Facultad</Label>
              <Input
                id="facultad-programa"
                value={facultadNueva}
                onChange={(e) => setFacultadNueva(e.target.value)}
                placeholder="Ej. Facultad de Derecho"
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
                  const creado = await crearProgramaApi({
                    nombre: nombreNuevo.trim(),
                    nivel: nivelNuevo,
                    facultad: facultadNueva.trim() || undefined,
                  })
                  setProgramas((prev) =>
                    [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)),
                  )
                  toast.success('Programa creado. Ya puede asignarse al cargar evidencias.')
                  setNombreNuevo('')
                  setFacultadNueva('')
                  setDialogoAbierto(false)
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
