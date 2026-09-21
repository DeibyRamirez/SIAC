'use client'

import { programasSemilla } from '@/lib/datos-semilla'
import { GuardiaSesion } from '@/components/auth/guardia-sesion'
import { ShellAplicacion } from '@/components/layout/shell-aplicacion'
import { Semaforo } from '@/components/siac/insignia-estado'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProgramasPage() {
  return (
    <GuardiaSesion rolPermitido="Administrador">
      <ContenidoProgramas />
    </GuardiaSesion>
  )
}

function ContenidoProgramas() {
  return (
    <ShellAplicacion titulo="Panel de programas">
      <EncabezadoPagina
        etiqueta="HU-010"
        titulo="Panel de programas"
        descripcion="Listado de programas de pregrado y posgrado con semáforo agregado de cumplimiento."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {programasSemilla.map((programa) => (
          <Card key={programa.id}>
            <CardHeader>
              <CardTitle className="text-lg">{programa.nombre}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {programa.nivel} · {programa.codigo}
              </p>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Semáforo agregado
                </p>
                <div className="mt-2">
                  <Semaforo valor={programa.semaforo} />
                </div>
              </div>
              {programa.semaforo === 'Rojo' && (
                <p className="max-w-xs text-xs text-red-700">
                  Anexo de infraestructura vencido detectado en el programa.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ShellAplicacion>
  )
}
