'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'

import { GuardiaSesion } from '@/components/auth/guardia-sesion'
import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { ShellAplicacion } from '@/components/layout/shell-aplicacion'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PlantillasCargadorPage() {
  return (
    <GuardiaSesion rolPermitido="Cargador">
      <ContenidoPlantillas />
    </GuardiaSesion>
  )
}

function ContenidoPlantillas() {
  const { datos } = usarAlmacen()
  const [mensaje, setMensaje] = useState<string | null>(null)

  const plantillasVigentes = useMemo(
    () => datos.plantillas.filter((plantilla) => plantilla.vigente),
    [datos.plantillas],
  )

  function descargarPlantilla(nombre: string) {
    setMensaje(`Descarga simulada de "${nombre}".`)
  }

  return (
    <ShellAplicacion titulo="Biblioteca de plantillas">
      <EncabezadoPagina
        etiqueta="HU-005"
        titulo="Biblioteca de plantillas"
        descripcion="Descarga formatos oficiales vigentes. Como Cargador no puedes editar ni retirar plantillas."
      />

      {mensaje && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{mensaje}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plantillasVigentes.map((plantilla) => (
          <Card key={plantilla.id}>
            <CardHeader>
              <CardTitle className="text-base">{plantilla.nombre}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {plantilla.factor} · {plantilla.formato} · {plantilla.version}
              </p>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => descargarPlantilla(plantilla.nombre)}>
                <Download className="size-4" />
                Descargar formato
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        ¿Necesitas corregir un rechazo?{' '}
        <Link href="/cargador/evidencias" className="font-medium text-[#3a9c98]">
          Revisa tus evidencias
        </Link>
        .
      </p>
    </ShellAplicacion>
  )
}
