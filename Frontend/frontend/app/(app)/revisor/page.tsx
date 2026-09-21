'use client'

import Link from 'next/link'
import { FileCheck2 } from 'lucide-react'

import { GuardiaSesion } from '@/components/auth/guardia-sesion'
import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { ShellAplicacion } from '@/components/layout/shell-aplicacion'
import { EncabezadoPagina, TarjetaAcceso } from '@/components/siac/tarjeta-acceso'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function InicioRevisorPage() {
  return (
    <GuardiaSesion rolPermitido="Revisor">
      <ContenidoInicioRevisor />
    </GuardiaSesion>
  )
}

function ContenidoInicioRevisor() {
  const { sesion } = usarSesion()
  const { datos } = usarAlmacen()
  const pendientes = datos.evidencias.filter((evidencia) => evidencia.estado === 'Borrador')

  return (
    <ShellAplicacion titulo="Inicio del Revisor">
      <EncabezadoPagina
        etiqueta="ROL REVISOR"
        titulo={`Bienvenida, ${sesion?.nombre.split(' ')[0]}`}
        descripcion="Revisa borradores pendientes de dictamen y registra observaciones cuando corresponda."
      />

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <TarjetaAcceso
          titulo="Bandeja de revisión"
          descripcion="Consulta evidencias en borrador y emite aprobación o rechazo."
          href="/revisor/bandeja"
          icono={FileCheck2}
          detalle={`${pendientes.length} pendientes`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de la bandeja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Tienes <strong className="text-[#102f55]">{pendientes.length}</strong> evidencias en
            estado Borrador esperando dictamen.
          </p>
          <Link href="/revisor/bandeja" className="font-medium text-[#3a9c98]">
            Ir a la bandeja de revisión
          </Link>
        </CardContent>
      </Card>
    </ShellAplicacion>
  )
}
