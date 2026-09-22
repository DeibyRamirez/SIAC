'use client'

import { GuardiaSesion } from '@/components/auth/guardia-sesion'
import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { ShellAplicacion } from '@/components/layout/shell-aplicacion'
import { InsigniaEstado } from '@/components/siac/insignia-estado'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatearFecha, obtenerNombrePrograma } from '@/lib/utilidades-siac'

export default function VigenciasPage() {
  return (
    <GuardiaSesion rolPermitido="Administrador">
      <ContenidoVigencias />
    </GuardiaSesion>
  )
}

function ContenidoVigencias() {
  const { datos } = usarAlmacen()

  return (
    <ShellAplicacion titulo="Vigencias y alertas">
      <EncabezadoPagina
        etiqueta="HU-007"
        titulo="Semáforo de vigencias"
        descripcion="Consulta anexos críticos y alertas in-app generadas por vencimientos próximos o vencidos."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {(['Vigente', 'Proximo', 'Vencido'] as const).map((estado) => {
          const total = datos.anexosVigencia.filter((anexo) => anexo.estado === estado).length
          return (
            <Card key={estado}>
              <CardContent className="pt-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{estado}</p>
                <p className="mt-2 text-3xl font-semibold text-[#102f55]">{total}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Control de vigencias</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4">Documento</th>
                  <th className="py-3 pr-4">Programa</th>
                  <th className="py-3 pr-4">Vencimiento</th>
                  <th className="py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {datos.anexosVigencia.map((anexo) => (
                  <tr key={anexo.id} className="border-b border-border/70">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-[#102f55]">{anexo.titulo}</p>
                      <p className="text-xs text-muted-foreground">{anexo.tipo}</p>
                    </td>
                    <td className="py-3 pr-4">{obtenerNombrePrograma(anexo.programaId)}</td>
                    <td className="py-3 pr-4">{formatearFecha(anexo.fechaVencimiento)}</td>
                    <td className="py-3">
                      <InsigniaEstado estado={anexo.estado} tipo="vigencia" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas in-app</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {datos.alertas.map((alerta) => (
              <div key={alerta.id} className="rounded-lg border border-border p-4 text-sm">
                <p>{alerta.mensaje}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatearFecha(alerta.fecha)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ShellAplicacion>
  )
}
