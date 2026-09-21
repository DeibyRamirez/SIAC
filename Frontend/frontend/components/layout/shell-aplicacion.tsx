'use client'

import { BarraLateral } from '@/components/layout/barra-lateral'
import { BarraSuperior } from '@/components/layout/barra-superior'

export function ShellAplicacion({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-[#f5f7fa]">
      <BarraLateral />
      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior titulo={titulo} />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  )
}
