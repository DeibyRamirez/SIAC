'use client'

import { ClipboardCheck, FileCheck2, Files } from 'lucide-react'

import { GuardiaSesion } from '@/components/auth/guardia-sesion'
import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { ShellAplicacion } from '@/components/layout/shell-aplicacion'
import { InsigniaEstado } from '@/components/siac/insignia-estado'
import { EncabezadoPagina, TarjetaAcceso } from '@/components/siac/tarjeta-acceso'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { obtenerNombrePrograma } from '@/lib/utilidades-siac'

export default function InicioCargadorPage() {
  return (
    <GuardiaSesion rolPermitido="Cargador">
      <ContenidoInicioCargador />
    </GuardiaSesion>
  )
}

function ContenidoInicioCargador() {
  const { sesion } = usarSesion()
  const { datos } = usarAlmacen()
  const misEvidencias = datos.evidencias.filter(
    (evidencia) => evidencia.autorId === sesion?.usuarioId,
  )

  return (
    <ShellAplicacion titulo="Inicio del Cargador">
      <EncabezadoPagina
        etiqueta="ROL CARGADOR"
        titulo={`Bienvenida, ${sesion?.nombre.split(' ')[0]}`}
        descripcion="Accede rápidamente a la carga de evidencias, plantillas oficiales y el estado de tus documentos."
      />

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <TarjetaAcceso
          titulo="Cargar evidencia"
          descripcion="Sube PDF o Excel con metadatos de programa, periodo, factor e indicador."
          href="/cargador/evidencias/nueva"
          icono={Files}
        />
        <TarjetaAcceso
          titulo="Biblioteca de plantillas"
          descripcion="Descarga formatos oficiales vigentes para diligenciar fuera del sistema."
          href="/cargador/plantillas"
          icono={FileCheck2}
        />
        <TarjetaAcceso
          titulo="Mis evidencias"
          descripcion="Consulta, corrige o elimina borradores antes de enviarlos a revisión."
          href="/cargador/evidencias"
          icono={ClipboardCheck}
          detalle={`${misEvidencias.length} documentos registrados`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estado de tus documentos</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pr-4">Documento</th>
                <th className="py-3 pr-4">Programa</th>
                <th className="py-3 pr-4">Periodo</th>
                <th className="py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {misEvidencias.map((evidencia) => (
                <tr key={evidencia.id} className="border-b border-border/70">
                  <td className="py-3 pr-4 font-medium text-[#102f55]">{evidencia.nombre}</td>
                  <td className="py-3 pr-4">{obtenerNombrePrograma(evidencia.programaId)}</td>
                  <td className="py-3 pr-4">{evidencia.periodo}</td>
                  <td className="py-3">
                    <InsigniaEstado estado={evidencia.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </ShellAplicacion>
  )
}
