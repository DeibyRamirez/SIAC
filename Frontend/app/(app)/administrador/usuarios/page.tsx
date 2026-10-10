'use client'

import { Building2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { EncabezadoPagina, PanelVacio } from '@/components/siac/tarjeta-acceso'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  obtenerResumenInstitucionApi,
  type InstitucionResumen,
} from '@/lib/servicios/institucion.servicio'
import { listarProgramasApi } from '@/lib/servicios/programas.servicio'
import {
  asignarAlcanceInstitucionalUsuarioApi,
  asignarProgramasUsuarioApi,
  listarProgramasDeUsuarioApi,
  listarUsuariosApi,
  type ProgramaAsignadoApi,
  type UsuarioApi,
} from '@/lib/servicios/usuarios.servicio'
import type { Programa } from '@/lib/tipos'
import { suscribirProgramasActualizados } from '@/lib/utilidades/eventos-programas'

export default function AsignacionProgramasPage() {
  return (
    <PlantillaPaginaApp titulo="Asignación de programas" rol="Administrador">
      <ContenidoAsignacion />
    </PlantillaPaginaApp>
  )
}

function ContenidoAsignacion() {
  const [usuarios, setUsuarios] = useState<UsuarioApi[]>([])
  const [programas, setProgramas] = useState<Programa[]>([])
  const [resumenInstitucion, setResumenInstitucion] = useState<InstitucionResumen | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usuarioActivo, setUsuarioActivo] = useState<UsuarioApi | null>(null)

  useEffect(() => {
    if (!apiDisponible()) {
      setError('La asignación requiere la API.')
      setCargando(false)
      return
    }
    function cargar() {
      Promise.all([listarUsuariosApi(), listarProgramasApi(), obtenerResumenInstitucionApi()])
        .then(([listaUsuarios, listaProgramas, resumen]) => {
          setUsuarios(listaUsuarios)
          setProgramas(listaProgramas.filter((programa) => programa.activo !== false))
          setResumenInstitucion(resumen)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'No se pudo cargar la asignación.')
        })
        .finally(() => setCargando(false))
    }
    cargar()
    return suscribirProgramasActualizados(() => {
      listarProgramasApi()
        .then((listaProgramas) => {
          setProgramas(listaProgramas.filter((programa) => programa.activo !== false))
        })
        .catch(() => {})
    })
  }, [])

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="HU-011"
        titulo="Asignación de programas"
        descripcion="Asigne programas académicos (G1/G2) y el proceso institucional único (G3/G4) a cargadores y revisores. Los roles se gestionan en superadministrador."
      />

      {cargando ? <p className="text-sm text-muted-foreground">Cargando usuarios…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!cargando && !error && usuarios.length === 0 ? (
        <PanelVacio mensaje="No hay usuarios para asignar." />
      ) : null}

      <div className="grid gap-4">
        {usuarios.map((usuario) => (
          <Card key={usuario.id}>
            <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="font-semibold text-primary">{usuario.nombre}</p>
                <p className="truncate text-sm text-muted-foreground">{usuario.correo}</p>
                <Badge variant="secondary">{usuario.rol}</Badge>
                {usuario.rol === 'Cargador' || usuario.rol === 'Revisor' ? (
                  <div className="space-y-2">
                    <ListaProgramasAsignados programas={usuario.programasAsignados ?? []} />
                    {usuario.responsableProcesoInstitucional ? (
                      <InsigniaProcesoInstitucional
                        rol={usuario.rol}
                        nombreTramite={resumenInstitucion?.nombreTramite}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {usuario.rol === 'Cargador' || usuario.rol === 'Revisor' ? (
                  <Button variant="outline" onClick={() => setUsuarioActivo(usuario)}>
                    Asignar alcance
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    La asignación de programas aplica solo a cargadores y revisores.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DialogoAsignacion
        usuario={usuarioActivo}
        programas={programas}
        resumenInstitucion={resumenInstitucion}
        onCerrar={() => setUsuarioActivo(null)}
        onGuardado={(actualizado) => {
          setUsuarios((prev) =>
            prev.map((item) => (item.id === actualizado.id ? { ...item, ...actualizado } : item)),
          )
        }}
      />
    </div>
  )
}

function InsigniaProcesoInstitucional({
  rol,
  nombreTramite,
}: {
  rol: UsuarioApi['rol']
  nombreTramite?: string
}) {
  const accion = rol === 'Revisor' ? 'Revisa' : 'Carga'
  return (
    <div
      className="inline-flex max-w-full flex-col gap-0.5 rounded-lg border-2 border-primary/40 bg-primary/10 px-3 py-2"
      aria-label="Proceso institucional asignado"
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
        <Building2 className="size-3.5 shrink-0" aria-hidden />
        {accion} renovación institución (G3·G4)
      </span>
      {nombreTramite ? (
        <span className="text-[11px] text-muted-foreground">{nombreTramite}</span>
      ) : null}
    </div>
  )
}

function ListaProgramasAsignados({ programas }: { programas: ProgramaAsignadoApi[] }) {
  if (programas.length === 0) {
    return <p className="text-xs text-muted-foreground">Sin programas asignados</p>
  }
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Programas asignados">
      {programas.map((programa) => (
        <li key={programa.id}>
          <Badge variant="outline" className="max-w-full font-normal">
            <span className="truncate">{programa.nombre}</span>
            {programa.activo === false ? (
              <span className="ml-1 text-muted-foreground">(inactivo)</span>
            ) : null}
          </Badge>
        </li>
      ))}
    </ul>
  )
}

function DialogoAsignacion({
  usuario,
  programas,
  resumenInstitucion,
  onCerrar,
  onGuardado,
}: {
  usuario: UsuarioApi | null
  programas: Programa[]
  resumenInstitucion: InstitucionResumen | null
  onCerrar: () => void
  onGuardado: (usuario: UsuarioApi) => void
}) {
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [responsableInstitucional, setResponsableInstitucional] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!usuario) return
    setCargando(true)
    setResponsableInstitucional(usuario.responsableProcesoInstitucional ?? false)
    listarProgramasDeUsuarioApi(usuario.id)
      .then((respuesta) => setSeleccion(respuesta.datos.map((programa) => programa.id)))
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'No se pudieron leer los programas.')
        setSeleccion([])
      })
      .finally(() => setCargando(false))
  }, [usuario])

  function alternar(programaId: string) {
    setSeleccion((actual) =>
      actual.includes(programaId)
        ? actual.filter((id) => id !== programaId)
        : [...actual, programaId],
    )
  }

  const etiquetaInstitucional =
    usuario?.rol === 'Revisor'
      ? 'Responsable de revisar el proceso institucional (G3 y G4)'
      : 'Responsable de cargar el proceso institucional (G3 y G4)'

  return (
    <Dialog open={usuario !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alcance de {usuario?.nombre}</DialogTitle>
        </DialogHeader>
        {cargando ? (
          <p className="text-sm text-muted-foreground">Cargando asignación…</p>
        ) : (
          <div className="space-y-4">
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {programas.map((programa) => (
                <li key={programa.id}>
                  <label className="flex items-start gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={seleccion.includes(programa.id)}
                      onChange={() => alternar(programa.id)}
                    />
                    <span>
                      <span className="font-medium text-primary">{programa.nombre}</span>
                      <span className="block text-xs text-muted-foreground">
                        {programa.codigo}
                        {programa.facultad ? ` · ${programa.facultad}` : ''}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Proceso institucional único
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {resumenInstitucion?.nombreTramite ??
                  'Renovación o condiciones institucionales (G3/G4)'}
              </p>
              <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={responsableInstitucional}
                  onChange={(e) => setResponsableInstitucional(e.target.checked)}
                />
                <span>{etiquetaInstitucional}</span>
              </label>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={!usuario || guardando || cargando}
            onClick={async () => {
              if (!usuario) return
              setGuardando(true)
              try {
                const [respuestaProgramas, respuestaInstitucional] = await Promise.all([
                  asignarProgramasUsuarioApi(usuario.id, seleccion),
                  asignarAlcanceInstitucionalUsuarioApi(usuario.id, responsableInstitucional),
                ])
                onGuardado({
                  ...usuario,
                  programasAsignados: respuestaProgramas.datos,
                  responsableProcesoInstitucional:
                    respuestaInstitucional.datos.responsableProcesoInstitucional,
                })
                toast.success('Alcance guardado. El cambio aplica de inmediato.')
                onCerrar()
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'No se pudo asignar.')
              } finally {
                setGuardando(false)
              }
            }}
          >
            {guardando ? 'Guardando…' : 'Guardar asignación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
