'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FileCheck2 } from 'lucide-react'

import { usarSesion } from '@/components/auth/proveedor-sesion'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { TarjetaKpi } from '@/components/siac/tarjeta-kpi'
import { EncabezadoPagina, PanelVacio, TarjetaAcceso } from '@/components/siac/tarjeta-acceso'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { obtenerConteosEvidenciasApi } from '@/lib/servicios/evidencias.servicio'
import { listarProgramasApi } from '@/lib/servicios/programas.servicio'
import type { Programa } from '@/lib/tipos'
import { obtenerSaludo } from '@/lib/utilidades-siac'

export default function InicioRevisorPage() {
  return (
    <PlantillaPaginaApp titulo="Resumen general" rol="Revisor">
      <ContenidoInicioRevisor />
    </PlantillaPaginaApp>
  )
}

function ContenidoInicioRevisor() {
  const { sesion } = usarSesion()
  const [programas, setProgramas] = useState<Programa[]>([])
  const [conteos, setConteos] = useState({ enRevision: 0, validado: 0, rechazado: 0 })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!apiDisponible()) {
      setError('El inicio del revisor requiere la API. No se usan datos de prueba.')
      return
    }
    Promise.all([listarProgramasApi(), obtenerConteosEvidenciasApi()])
      .then(([lista, resumen]) => {
        setProgramas(lista)
        setConteos({
          enRevision: resumen.enRevision,
          validado: resumen.validado,
          rechazado: resumen.rechazado,
        })
      })
      .catch(() => {
        setProgramas([])
        setError('No se pudo cargar la bandeja de sus programas.')
      })
  }, [])

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Rol revisor"
        titulo={`${obtenerSaludo()}, ${sesion?.nombre.split(' ')[0] ?? ''}`}
        descripcion="Solo ve y verifica los documentos de los programas que tiene asignados."
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TarjetaKpi titulo="Pendientes" valor={conteos.enRevision} icono={FileCheck2} acento="coral" />
        <TarjetaKpi titulo="Aprobadas" valor={conteos.validado} acento="esmeralda" />
        <TarjetaKpi titulo="Correcciones" valor={conteos.rechazado} acento="purpura" />
      </div>

      <TarjetaAcceso
        titulo="Bandeja de revisión"
        descripcion="Evidencias en revisión de sus programas asignados."
        href="/revisor/bandeja"
        icono={FileCheck2}
        detalle={`${conteos.enRevision} pendientes`}
        acento="cyan"
      />

      <Card className="border-l-4 border-cyan-tecnico">
        <CardHeader>
          <CardTitle>Programas asignados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {programas.length === 0 ? (
            <PanelVacio mensaje="Aún no tiene programas asignados." />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {programas.map((programa) => (
                <li key={programa.id} className="rounded-lg border border-border px-3 py-2">
                  <p className="font-medium text-primary">{programa.nombre}</p>
                  <p className="text-xs">
                    {programa.codigo}
                    {programa.facultad ? ` · ${programa.facultad}` : ''}
                    {programa.conteosEstado
                      ? ` · ${programa.conteosEstado.enRevision} en revisión`
                      : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/revisor/bandeja" className="inline-block font-medium text-esmeralda">
            Ir a la bandeja de revisión
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
