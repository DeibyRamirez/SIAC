'use client'

import { useEffect, useState } from 'react'

import { GuardiaSesion } from '@/components/auth/guardia-sesion'
import { BarraLateral } from '@/components/layout/barra-lateral'
import { BarraSuperior } from '@/components/layout/barra-superior'
import { PieInstitucional } from '@/components/layout/pie-institucional'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import type { RolUsuario } from '@/lib/tipos'

export const CLAVE_SIDEBAR_PLEGADO = 'siac-sidebar-plegado'

export function ShellAplicacion({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false)
  const [plegado, setPlegado] = useState(false)

  useEffect(() => {
    const guardado = localStorage.getItem(CLAVE_SIDEBAR_PLEGADO)
    if (guardado === 'true') {
      setPlegado(true)
    }
  }, [])

  function alternarSidebar() {
    setPlegado((prev) => {
      const nuevo = !prev
      localStorage.setItem(CLAVE_SIDEBAR_PLEGADO, String(nuevo))
      return nuevo
    })
  }

  return (
    <div className="fondo-app flex h-dvh min-h-0 overflow-hidden">
      <BarraLateral
        className="hidden md:flex"
        plegado={plegado}
        onAlternarPlegado={alternarSidebar}
      />
      <Sheet open={menuMovilAbierto} onOpenChange={setMenuMovilAbierto}>
        <SheetContent side="left" className="w-64 p-0 sm:max-w-xs">
          <BarraLateral
            className="flex h-full w-full border-0"
            alNavegar={() => setMenuMovilAbierto(false)}
          />
        </SheetContent>
      </Sheet>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <BarraSuperior titulo={titulo} onAbrirMenu={() => setMenuMovilAbierto(true)} />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
        <PieInstitucional />
      </div>
    </div>
  )
}

export function PlantillaPaginaApp({
  titulo,
  rol,
  roles,
  children,
}: {
  titulo: string
  rol?: RolUsuario
  roles?: RolUsuario[]
  children: React.ReactNode
}) {
  return (
    <GuardiaSesion rolPermitido={rol} rolesPermitidos={roles}>
      <ShellAplicacion titulo={titulo}>{children}</ShellAplicacion>
    </GuardiaSesion>
  )
}
