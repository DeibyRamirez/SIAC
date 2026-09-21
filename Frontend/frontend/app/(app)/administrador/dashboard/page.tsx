'use client'

import { useState } from 'react'

import { GuardiaSesion } from '@/components/auth/guardia-sesion'
import { ShellAplicacion } from '@/components/layout/shell-aplicacion'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { programasSemilla } from '@/lib/datos-semilla'

export default function DashboardPowerBiPage() {
  return (
    <GuardiaSesion rolPermitido="Administrador">
      <ContenidoDashboard />
    </GuardiaSesion>
  )
}

function ContenidoDashboard() {
  const [programaId, setProgramaId] = useState(programasSemilla[0]?.id ?? '')
  const [tokenValido, setTokenValido] = useState(true)

  const programa = programasSemilla.find((item) => item.id === programaId)

  return (
    <ShellAplicacion titulo="Dashboard Power BI">
      <EncabezadoPagina
        etiqueta="HU-009"
        titulo="Dashboard del programa"
        descripcion="Contenedor embebido para métricas de Power BI. En producción se usará un embed token de Azure."
      />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-end">
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Programa</span>
            <select
              value={programaId}
              onChange={(evento) => setProgramaId(evento.target.value)}
              className="w-full min-w-[280px] rounded-lg border border-input px-3 py-2"
            >
              {programasSemilla.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>
          <Button variant="outline" onClick={() => setTokenValido((prev) => !prev)}>
            Simular token {tokenValido ? 'expirado' : 'válido'}
          </Button>
        </CardContent>
      </Card>

      {tokenValido ? (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="border-b px-4 py-3 text-sm text-muted-foreground">
            Informe embebido · {programa?.nombre}
          </div>
          <div className="flex min-h-[420px] items-center justify-center bg-[#f8fafc] p-8 text-center">
            <div>
              <p className="text-lg font-semibold text-[#102f55]">Power BI embebido</p>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Placeholder del informe institucional. Aquí se renderizará el iframe con el embed
                token cuando la integración con Azure esté disponible.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-red-700">
              No fue posible cargar el informe de Power BI. El token embebido expiró o Azure no
              respondió.
            </p>
            <Button onClick={() => setTokenValido(true)}>Reintentar carga</Button>
          </CardContent>
        </Card>
      )}
    </ShellAplicacion>
  )
}
