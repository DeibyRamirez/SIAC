'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'

import {
  autenticarUsuario,
  cerrarSesionLocal,
  crearSesion,
  etiquetaRol,
  guardarSesionLocal,
  leerSesionLocal,
  rutaInicioPorRol,
} from '@/lib/auth-mock'
import { iniciarSesionApi, cerrarSesionApi, obtenerPerfilApi } from '@/lib/servicios/auth.servicio'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import type { SesionUsuario } from '@/lib/tipos'

interface ContextoSesion {
  sesion: SesionUsuario | null
  cargando: boolean
  usarApi: boolean
  iniciarSesion: (correo: string, contrasena: string) => Promise<string | null>
  cerrarSesion: () => void
  etiquetaRolActual: string
}

const ContextoSesionSiac = createContext<ContextoSesion | null>(null)

export function ProveedorSesion({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [sesion, setSesion] = useState<SesionUsuario | null>(null)
  const [cargando, setCargando] = useState(true)
  const usarApi = apiDisponible()

  useEffect(() => {
    async function restaurarSesion() {
      if (usarApi) {
        try {
          const perfil = await obtenerPerfilApi()
          setSesion({
            usuarioId: perfil.id,
            nombre: perfil.nombre,
            correo: perfil.correo,
            rol: perfil.rol,
          })
        } catch {
          setSesion(leerSesionLocal())
        }
      } else {
        setSesion(leerSesionLocal())
      }
      setCargando(false)
    }
    restaurarSesion()
  }, [usarApi])

  const iniciarSesion = useCallback(
    async (correo: string, contrasena: string) => {
      if (!correo.trim() || !contrasena.trim()) {
        return 'Ingresa correo y contraseña.'
      }

      if (usarApi) {
        try {
          const respuesta = await iniciarSesionApi(correo, contrasena)
          const nuevaSesion: SesionUsuario = {
            usuarioId: respuesta.usuario.id,
            nombre: respuesta.usuario.nombre,
            correo: respuesta.usuario.correo,
            rol: respuesta.usuario.rol,
          }
          guardarSesionLocal(nuevaSesion)
          setSesion(nuevaSesion)
          router.replace(rutaInicioPorRol(nuevaSesion.rol))
          return null
        } catch (error) {
          const mensaje = error instanceof Error ? error.message : 'Error de autenticación.'
          if (!correo.trim().toLowerCase().endsWith('@uniautonoma.edu.co')) {
            return 'Solo se permiten cuentas @uniautonoma.edu.co.'
          }
          return mensaje
        }
      }

      const usuario = autenticarUsuario(correo, contrasena)
      if (!usuario) {
        if (!correo.trim().toLowerCase().endsWith('@uniautonoma.edu.co')) {
          return 'Solo se permiten cuentas @uniautonoma.edu.co.'
        }
        return 'Credenciales inválidas. Verifica correo y contraseña.'
      }

      const nuevaSesion = crearSesion(usuario)
      guardarSesionLocal(nuevaSesion)
      setSesion(nuevaSesion)
      router.replace(rutaInicioPorRol(nuevaSesion.rol))
      return null
    },
    [router, usarApi],
  )

  const cerrarSesion = useCallback(() => {
    if (usarApi) cerrarSesionApi()
    cerrarSesionLocal()
    setSesion(null)
    router.replace('/login')
  }, [router, usarApi])

  const valor = useMemo(
    () => ({
      sesion,
      cargando,
      usarApi,
      iniciarSesion,
      cerrarSesion,
      etiquetaRolActual: sesion ? etiquetaRol(sesion.rol) : '',
    }),
    [sesion, cargando, usarApi, iniciarSesion, cerrarSesion],
  )

  return (
    <ContextoSesionSiac.Provider value={valor}>{children}</ContextoSesionSiac.Provider>
  )
}

export function usarSesion() {
  const contexto = useContext(ContextoSesionSiac)
  if (!contexto) {
    throw new Error('usarSesion debe usarse dentro de ProveedorSesion.')
  }
  return contexto
}
