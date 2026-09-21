'use client'

import Link from 'next/link'
import { useMemo } from 'react'

import { GuardiaSesion } from '@/components/auth/guardia-sesion'
import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { ShellAplicacion } from '@/components/layout/shell-aplicacion'
import { InsigniaEstado } from '@/components/siac/insignia-estado'
import { EncabezadoPagina, PanelVacio } from '@/components/siac/tarjeta-acceso'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatearFecha, obtenerNombrePrograma } from '@/lib/utilidades-siac'

export default function BandejaRevisorPage() {
  return (
    <GuardiaSesion rolPermitido="Revisor">
      <ContenidoBandeja />
    </GuardiaSesion>
  )
}

function ContenidoBandeja() {
  const { datos } = usarAlmacen()
  const borradores = useMemo(
    () =>
      datos.evidencias.filter(
        (evidencia) => evidencia.estado === 'Borrador' || evidencia.estado === 'EnRevision',
      ),
    [datos.evidencias],
  )

  return (
    <ShellAplicacion titulo="Bandeja de revisión">
      <EncabezadoPagina
        etiqueta="HU-006"
        titulo="Bandeja de revisión"
        descripcion="Solo se listan evidencias en estado Borrador pendientes de dictamen."
      />

      {borradores.length === 0 ? (
        <PanelVacio mensaje="No hay evidencias pendientes de revisión." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-6">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4">Documento</th>
                  <th className="py-3 pr-4">Programa</th>
                  <th className="py-3 pr-4">Factor</th>
                  <th className="py-3 pr-4">Periodo</th>
                  <th className="py-3 pr-4">Estado</th>
                  <th className="py-3 pr-4">Fecha</th>
                  <th className="py-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {borradores.map((evidencia) => (
                  <tr key={evidencia.id} className="border-b border-border/70">
                    <td className="py-3 pr-4 font-medium text-[#102f55]">{evidencia.nombre}</td>
                    <td className="py-3 pr-4">{obtenerNombrePrograma(evidencia.programaId)}</td>
                    <td className="py-3 pr-4">{evidencia.factor}</td>
                    <td className="py-3 pr-4">{evidencia.periodo}</td>
                    <td className="py-3 pr-4">
                      <InsigniaEstado estado={evidencia.estado} />
                    </td>
                    <td className="py-3 pr-4">{formatearFecha(evidencia.fechaCarga)}</td>
                    <td className="py-3">
                      <Link href={`/revisor/bandeja/${evidencia.id}`}>
                        <Button size="sm" variant="outline">
                          Revisar
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </ShellAplicacion>
  )
}
