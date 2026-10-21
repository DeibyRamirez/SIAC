'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { CampoContrasena } from '@/components/siac/campo-contrasena'
import { DialogoConfirmacion } from '@/components/siac/dialogo-confirmacion'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  actualizarRolUsuarioApi,
  actualizarUsuarioApi,
  type UsuarioApi,
} from '@/lib/servicios/usuarios.servicio'
import type { RolUsuario } from '@/lib/tipos'
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

export interface DialogoEditarUsuarioProps {
  usuario: UsuarioApi | null
  abierto: boolean
  onCerrar: () => void
  onGuardado: (actualizado: UsuarioApi) => void
}

export function DialogoEditarUsuario({
  usuario,
  abierto,
  onCerrar,
  onGuardado,
}: DialogoEditarUsuarioProps) {
  const [nombre, setNombre] = useState('')
  const [cargo, setCargo] = useState('')
  const [dependencia, setDependencia] = useState('')
  const [rol, setRol] = useState<RolUsuario>('Cargador')
  const [contrasena, setContrasena] = useState('')
  const [rolOriginal, setRolOriginal] = useState<RolUsuario>('Cargador')
  const [confirmarAbierto, setConfirmarAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!usuario || !abierto) return
    setNombre(usuario.nombre)
    setCargo(usuario.cargo ?? '')
    setDependencia(usuario.dependencia ?? '')
    setRol(usuario.rol)
    setRolOriginal(usuario.rol)
    setContrasena('')
    setConfirmarAbierto(false)
  }, [usuario, abierto])

  const resumenConfirmacion = useMemo(() => {
    if (!usuario) return ''
    const partes: string[] = [`Nombre: ${nombre.trim()}`]
    if (rol !== rolOriginal) {
      partes.push(`Rol: ${rolOriginal} → ${rol}`)
    }
    if (contrasena.trim().length > 0) {
      partes.push('Se actualizará la contraseña.')
    }
    return partes.join(' · ')
  }, [usuario, nombre, rol, rolOriginal, contrasena])

  function solicitarConfirmacion(evento: React.FormEvent) {
    evento.preventDefault()
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio.')
      return
    }
    if (contrasena.trim().length > 0 && !cumplePoliticaContrasena(contrasena)) {
      toast.error(MENSAJE_POLITICA_CONTRASENA)
      return
    }
    setConfirmarAbierto(true)
  }

  async function guardarCambios() {
    if (!usuario) return
    setGuardando(true)
    try {
      const payload: {
        nombre: string
        cargo?: string
        dependencia?: string
        contrasena?: string
      } = {
        nombre: nombre.trim(),
        cargo: cargo.trim() || undefined,
        dependencia: dependencia.trim() || undefined,
      }
      if (contrasena.trim().length >= 6) {
        payload.contrasena = contrasena.trim()
      }

      let actualizado = await actualizarUsuarioApi(usuario.id, payload)
      if (rol !== rolOriginal) {
        actualizado = await actualizarRolUsuarioApi(usuario.id, rol)
      }

      toast.success('Usuario actualizado.')
      onGuardado(actualizado)
      setConfirmarAbierto(false)
      onCerrar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el usuario.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <Dialog open={abierto} onOpenChange={(open) => !open && onCerrar()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          {usuario ? (
            <form className="grid gap-4" onSubmit={solicitarConfirmacion}>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Correo</span>
                <Input value={usuario.correo} readOnly disabled className="bg-muted" />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Nombre completo</span>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Rol</span>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as RolUsuario)}
                  className="w-full rounded-lg border border-input px-3 py-2"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
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
              <CampoContrasena
                id="contrasena-editar-usuario"
                label="Nueva contraseña (opcional)"
                value={contrasena}
                onChange={setContrasena}
                placeholder="Dejar vacío para no cambiar"
                autoComplete="new-password"
              />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={onCerrar}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <DialogoConfirmacion
        abierto={confirmarAbierto}
        titulo="¿Estás seguro de guardar los cambios?"
        descripcion={`Se aplicarán los cambios en este usuario. ${resumenConfirmacion}`}
        etiquetaConfirmar="Sí, guardar"
        cargando={guardando}
        onConfirmar={guardarCambios}
        onCancelar={() => setConfirmarAbierto(false)}
      />
    </>
  )
}
