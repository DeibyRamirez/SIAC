'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { prefijoRol } from '@/lib/auth-mock'
import type { RolUsuario } from '@/lib/tipos'
import { usarSesion } from '@/components/auth/proveedor-sesion'

export function GuardiaSesion({
  rolPermitido,
  children,
}: {
  rolPermitido: RolUsuario
  children: React.ReactNode
}) {
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

    if (sesion.rol !== rolPermitido) {
      router.replace(prefijoRol(sesion.rol))
      return
    }

    const prefijoEsperado = prefijoRol(rolPermitido)
    if (!pathname.startsWith(prefijoEsperado)) {
      router.replace(prefijoEsperado)
    }
  }, [cargando, sesion, router, pathname, rolPermitido])

  if (cargando || !sesion || sesion.rol !== rolPermitido) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando sesión...
      </div>
    )
  }

  return <>{children}</>
}
