'use client'

import Link from 'next/link'
import { FileCheck2 } from 'lucide-react'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { TarjetaKpi } from '@/components/siac/tarjeta-kpi'
import { EncabezadoPagina, TarjetaAcceso } from '@/components/siac/tarjeta-acceso'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { contarEvidenciasPendientes, obtenerSaludo } from '@/lib/utilidades-siac'

export default function InicioRevisorPage() {
  return (
    <PlantillaPaginaApp titulo="Resumen general" rol="Revisor">
      <ContenidoInicioRevisor />
    </PlantillaPaginaApp>
  )
}

function ContenidoInicioRevisor() {
  const { sesion } = usarSesion()
  const { datos } = usarAlmacen()
  const pendientes = contarEvidenciasPendientes(datos.evidencias)
  const aprobadas = datos.evidencias.filter((e) => e.estado === 'Validado').length
  const correcciones = datos.evidencias.filter((e) => e.estado === 'Rechazado').length

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Rol revisor"
        titulo={`${obtenerSaludo()}, ${sesion?.nombre.split(' ')[0]}`}
        descripcion="Revisa evidencias pendientes de dictamen y registra observaciones cuando corresponda."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <TarjetaKpi titulo="Pendientes" valor={pendientes} icono={FileCheck2} acento="coral" />
        <TarjetaKpi titulo="Aprobadas" valor={aprobadas} acento="esmeralda" />
        <TarjetaKpi titulo="Correcciones" valor={correcciones} acento="purpura" />
      </div>

      <TarjetaAcceso
        titulo="Bandeja de revisión"
        descripcion="Consulta evidencias pendientes y emite aprobación o rechazo."
        href="/revisor/bandeja"
        icono={FileCheck2}
        detalle={`${pendientes} pendientes`}
        acento="cyan"
      />

      <Card className="border-l-4 border-cyan-tecnico">
        <CardHeader>
          <CardTitle>Resumen de la bandeja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Tienes <strong className="text-primary">{pendientes}</strong> evidencias esperando
            dictamen.
          </p>
          <Link href="/revisor/bandeja" className="font-medium text-esmeralda">
            Ir a la bandeja de revisión
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
