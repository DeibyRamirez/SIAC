'use client'

import { useEffect } from 'react'

import { usarSesion } from '@/components/auth/proveedor-sesion'

/**
 * Ejecuta `cargar` cuando la sesión está lista y hay usuario autenticado.
 * Evita peticiones API en /login o antes de que exista la cookie de sesión.
 */
export function usarCargaConSesion(
  cargar: () => void | Promise<void>,
  deps: ReadonlyArray<unknown> = [],
) {
  const { sesion, cargando } = usarSesion()

  useEffect(() => {
    if (cargando || !sesion?.usuarioId) return
    void cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps explícitas del llamador
  }, [cargando, sesion?.usuarioId, cargar, ...deps])
}
