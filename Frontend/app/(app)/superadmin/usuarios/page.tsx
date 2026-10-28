'use client'

import { nombreVisibleRol } from '@/lib/constantes/roles'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { DialogoConfirmacion } from '@/components/siac/dialogo-confirmacion'
import { DialogoEditarUsuario } from '@/components/siac/dialogo-editar-usuario'
import { CampoContrasena } from '@/components/siac/campo-contrasena'
import { EncabezadoPagina, PanelVacio } from '@/components/siac/tarjeta-acceso'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  actualizarUsuarioApi,
  crearUsuarioApi,
  desactivarUsuarioApi,
  listarUsuariosApi,
  type UsuarioApi,
} from '@/lib/servicios/usuarios.servicio'
import type { RolUsuario } from '@/lib/tipos'
import { usarCargaConSesion } from '@/lib/hooks/usar-carga-con-sesion'
import {
  cumplePoliticaContrasena,
  MENSAJE_POLITICA_CONTRASENA,
} from '@/lib/utilidades/politica-contrasena'

const ROLES: RolUsuario[] = [
  'Cargador',
  'Revisor',
  'Administrador',
  'SuperAdmin',
]

export default function GestionUsuariosPage() {
  return (
    <PlantillaPaginaApp titulo="Gestión de usuarios" rol="SuperAdmin">
      <ContenidoUsuarios />
    </PlantillaPaginaApp>
  )
}

function ContenidoUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioApi[]>([])
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [rol, setRol] = useState<RolUsuario>('Cargador')
  const [cargo, setCargo] = useState('')
  const [dependencia, setDependencia] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [idDesactivar, setIdDesactivar] = useState<string | null>(null)
  const [usuarioEditar, setUsuarioEditar] = useState<UsuarioApi | null>(null)
  const [idReactivar, setIdReactivar] = useState<string | null>(null)

  const cargarUsuarios = useCallback(async () => {
    if (!apiDisponible()) {
      setCargando(false)
      return
    }
    setCargando(true)
    try {
      const lista = await listarUsuariosApi()
      setUsuarios(lista)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios.')
    } finally {
      setCargando(false)
    }
  }, [])

  usarCargaConSesion(cargarUsuarios)

  async function crearUsuario(evento: React.FormEvent) {
    evento.preventDefault()
    if (!cumplePoliticaContrasena(contrasena)) {
      toast.error(MENSAJE_POLITICA_CONTRASENA)
      return
    }
    setGuardando(true)
    try {
      const creado = await crearUsuarioApi({
        nombre: nombre.trim(),
        correo: correo.trim(),
        contrasena,
        rol,
        cargo: cargo.trim() || undefined,
        dependencia: dependencia.trim() || undefined,
      })
      setUsuarios((prev) => [creado, ...prev])
      setNombre('')
      setCorreo('')
      setContrasena('')
      setCargo('')
      setDependencia('')
      toast.success('Usuario creado correctamente.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear el usuario.')
    } finally {
      setGuardando(false)
    }
  }

  async function confirmarDesactivar() {
    if (!idDesactivar) return
    try {
      const actualizado = await desactivarUsuarioApi(idDesactivar)
      setUsuarios((prev) => prev.map((u) => (u.id === idDesactivar ? actualizado : u)))
      toast.success('Usuario desactivado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo desactivar el usuario.')
    } finally {
      setIdDesactivar(null)
    }
  }

  async function confirmarReactivar() {
    if (!idReactivar) return
    try {
      const actualizado = await actualizarUsuarioApi(idReactivar, { activo: true })
      setUsuarios((prev) => prev.map((u) => (u.id === idReactivar ? actualizado : u)))
      toast.success('Usuario reactivado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo reactivar el usuario.')
    } finally {
      setIdReactivar(null)
    }
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="HU-011"
        titulo="Gestión de usuarios"
        descripcion="Crea y administra perfiles con acceso al sistema SIAC. Los usuarios no se eliminan de la base de datos; solo se desactivan."
      />

      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={crearUsuario}>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Nombre completo</span>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Correo institucional</span>
              <Input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="usuario@uniautonoma.edu.co"
                required
              />
            </label>
            <CampoContrasena
              id="contrasena-nuevo-usuario"
              label="Contraseña"
              value={contrasena}
              onChange={setContrasena}
              required
            />
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Rol</span>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value as RolUsuario)}
                className="w-full rounded-lg border border-input px-3 py-2"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {nombreVisibleRol(r)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Cargo</span>
              <Input value={cargo} onChange={(e) => setCargo(e.target.value)} />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Dependencia</span>
              <Input value={dependencia} onChange={(e) => setDependencia(e.target.value)} />
            </label>
            <div className="md:col-span-2">
              <Button type="submit" disabled={guardando || !apiDisponible()}>
                {guardando ? 'Creando…' : 'Crear usuario'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando usuarios…</p>
      ) : usuarios.length === 0 ? (
        <PanelVacio mensaje="No hay usuarios registrados o la API no está disponible." />
      ) : (
        <div className="tabla-institucional overflow-x-auto rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell className="font-medium">{usuario.nombre}</TableCell>
                  <TableCell>{usuario.correo}</TableCell>
                  <TableCell>{nombreVisibleRol(usuario.rol)}</TableCell>
                  <TableCell>
                    <Badge variant={usuario.activo ? 'default' : 'secondary'}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setUsuarioEditar(usuario)}
                      >
                        Editar
                      </Button>
                      {usuario.activo ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-fucsia/30 text-fucsia"
                          onClick={() => setIdDesactivar(usuario.id)}
                        >
                          Desactivar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIdReactivar(usuario.id)}
                        >
                          Reactivar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <DialogoEditarUsuario
        usuario={usuarioEditar}
        abierto={Boolean(usuarioEditar)}
        onCerrar={() => setUsuarioEditar(null)}
        onGuardado={(actualizado) => {
          setUsuarios((prev) => prev.map((u) => (u.id === actualizado.id ? actualizado : u)))
        }}
      />
      <DialogoConfirmacion
        abierto={Boolean(idDesactivar)}
        titulo="¿Desactivar usuario?"
        descripcion="El usuario no podrá iniciar sesión hasta que sea reactivado. El registro permanece en el sistema (baja lógica)."
        etiquetaConfirmar="Sí, desactivar"
        variant="destructive"
        onConfirmar={confirmarDesactivar}
        onCancelar={() => setIdDesactivar(null)}
      />
      <DialogoConfirmacion
        abierto={Boolean(idReactivar)}
        titulo="¿Reactivar usuario?"
        descripcion="El usuario volverá a poder iniciar sesión con sus credenciales actuales."
        etiquetaConfirmar="Sí, reactivar"
        onConfirmar={confirmarReactivar}
        onCancelar={() => setIdReactivar(null)}
      />
    </div>
  )
}
