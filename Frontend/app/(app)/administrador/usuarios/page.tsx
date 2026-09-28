'use client'

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
import { listarProgramasApi } from '@/lib/servicios/programas.servicio'
import {
  actualizarRolUsuarioApi,
  asignarProgramasUsuarioApi,
  listarProgramasDeUsuarioApi,
  listarUsuariosApi,
  type UsuarioApi,
} from '@/lib/servicios/usuarios.servicio'
import type { Programa, RolUsuario } from '@/lib/tipos'

const ROLES_ASIGNABLES: RolUsuario[] = ['Cargador', 'Revisor', 'ParAcademico', 'Administrador']

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
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usuarioActivo, setUsuarioActivo] = useState<UsuarioApi | null>(null)

  useEffect(() => {
    if (!apiDisponible()) {
      setError('La asignación requiere la API.')
      setCargando(false)
      return
    }
    Promise.all([listarUsuariosApi(), listarProgramasApi()])
      .then(([listaUsuarios, listaProgramas]) => {
        setUsuarios(listaUsuarios)
        setProgramas(listaProgramas.filter((programa) => programa.activo !== false))
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la asignación.')
      })
      .finally(() => setCargando(false))
  }, [])

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="HU-011"
        titulo="Asignación de programas"
        descripcion="Un cargador solo carga en sus programas y un revisor solo ve y verifica los suyos. El rol SuperAdmin no se asigna desde aquí."
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
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-primary">{usuario.nombre}</p>
                <p className="truncate text-sm text-muted-foreground">{usuario.correo}</p>
                <Badge variant="secondary">{usuario.rol}</Badge>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {usuario.rol === 'SuperAdmin' ? (
                  <p className="text-xs text-muted-foreground">Rol reservado al superadmin.</p>
                ) : (
                  <select
                    aria-label={`Rol de ${usuario.nombre}`}
                    value={usuario.rol}
                    className="rounded-lg border border-input px-3 py-2 text-sm"
                    onChange={async (evento) => {
                      const rol = evento.target.value as RolUsuario
                      try {
                        const actualizado = await actualizarRolUsuarioApi(usuario.id, rol)
                        setUsuarios((prev) =>
                          prev.map((item) => (item.id === usuario.id ? { ...item, ...actualizado } : item)),
                        )
                        toast.success('Rol actualizado.')
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'No se pudo cambiar el rol.')
                      }
                    }}
                  >
                    {ROLES_ASIGNABLES.map((rol) => (
                      <option key={rol} value={rol}>
                        {rol}
                      </option>
                    ))}
                  </select>
                )}
                {usuario.rol === 'Cargador' || usuario.rol === 'Revisor' ? (
                  <Button variant="outline" onClick={() => setUsuarioActivo(usuario)}>
                    Asignar programas
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DialogoAsignacion
        usuario={usuarioActivo}
        programas={programas}
        onCerrar={() => setUsuarioActivo(null)}
      />
    </div>
  )
}

function DialogoAsignacion({
  usuario,
  programas,
  onCerrar,
}: {
  usuario: UsuarioApi | null
  programas: Programa[]
  onCerrar: () => void
}) {
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!usuario) return
    setCargando(true)
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

  return (
    <Dialog open={usuario !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Programas de {usuario?.nombre}</DialogTitle>
        </DialogHeader>
        {cargando ? (
          <p className="text-sm text-muted-foreground">Cargando asignación…</p>
        ) : (
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
                await asignarProgramasUsuarioApi(usuario.id, seleccion)
                toast.success('Programas asignados. El cambio aplica de inmediato.')
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
