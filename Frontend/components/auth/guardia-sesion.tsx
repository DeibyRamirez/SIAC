'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { PantallaCargandoSiac } from '@/components/auth/pantalla-cargando-siac'
import {
  prefijoRol,
  rutaPermitidaParAcademico,
  rutaPermitidaSuperAdmin,
} from '@/lib/auth-mock'
import type { RolUsuario } from '@/lib/tipos'
import { usarSesion } from '@/components/auth/proveedor-sesion'

export function GuardiaSesion({
  rolPermitido,
  rolesPermitidos,
  children,
}: {
  rolPermitido?: RolUsuario
  rolesPermitidos?: RolUsuario[]
  children: React.ReactNode
}) {
  const roles = rolesPermitidos ?? (rolPermitido ? [rolPermitido] : [])
  const { sesion, cargando } = usarSesion()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (cargando) {
      return
    }

    if (!sesion) {
      router.replace('/login')
      return
    }

    const esSuperAdmin = sesion.rol === 'SuperAdmin'

    if (esSuperAdmin) {
      if (!rutaPermitidaSuperAdmin(pathname)) {
        router.replace('/superadmin')
      }
      return
    }

    if (sesion.rol === 'ParAcademico' && !rutaPermitidaParAcademico(pathname)) {
      router.replace('/administrador')
      return
    }

    if (!roles.includes(sesion.rol)) {
      router.replace(prefijoRol(sesion.rol))
      return
    }

    const prefijoEsperado = prefijoRol(sesion.rol)
    if (!pathname.startsWith(prefijoEsperado)) {
      router.replace(prefijoEsperado)
    }
  }, [cargando, sesion, router, pathname, roles])

  const accesoPermitido =
    sesion &&
    (roles.includes(sesion.rol) ||
      (sesion.rol === 'SuperAdmin' && rutaPermitidaSuperAdmin(pathname))) &&
    (sesion.rol !== 'ParAcademico' || rutaPermitidaParAcademico(pathname))

  if (cargando || !accesoPermitido) {
    return <PantallaCargandoSiac />
  }

  return <>{children}</>
}
