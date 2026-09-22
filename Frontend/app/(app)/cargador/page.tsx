'use client'

import { ClipboardCheck, FileCheck2, Files } from 'lucide-react'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { TablaEvidencias } from '@/components/siac/tabla-evidencias'
import { TarjetaKpi } from '@/components/siac/tarjeta-kpi'
import { EncabezadoPagina, TarjetaAcceso } from '@/components/siac/tarjeta-acceso'
import { obtenerSaludo } from '@/lib/utilidades-siac'

export default function InicioCargadorPage() {
  return (
    <PlantillaPaginaApp titulo="Resumen general" rol="Cargador">
      <ContenidoInicioCargador />
    </PlantillaPaginaApp>
  )
}

function ContenidoInicioCargador() {
  const { sesion } = usarSesion()
  const { datos } = usarAlmacen()
  const misEvidencias = datos.evidencias.filter(
    (evidencia) => evidencia.autorId === sesion?.usuarioId,
  )
  const borradores = misEvidencias.filter((e) => e.estado === 'Borrador').length
  const enRevision = misEvidencias.filter((e) => e.estado === 'EnRevision').length
  const validadas = misEvidencias.filter((e) => e.estado === 'Validado').length

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Rol cargador"
        titulo={`${obtenerSaludo()}, ${sesion?.nombre.split(' ')[0]}`}
        descripcion="Accede rápidamente a la carga de evidencias, plantillas oficiales y el estado de tus documentos."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <TarjetaKpi titulo="Mis documentos" valor={misEvidencias.length} icono={Files} acento="cyan" />
        <TarjetaKpi titulo="En borrador" valor={borradores} icono={ClipboardCheck} acento="ocre" />
        <TarjetaKpi titulo="Aprobados" valor={validadas} icono={FileCheck2} acento="esmeralda" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <TarjetaAcceso
          titulo="Cargar evidencia"
          descripcion="Sube PDF o Excel con metadatos de programa, periodo, factor e indicador."
          href="/cargador/evidencias/nueva"
          icono={Files}
          acento="cyan"
        />
        <TarjetaAcceso
          titulo="Biblioteca de plantillas"
          descripcion="Descarga formatos oficiales vigentes para diligenciar fuera del sistema."
          href="/cargador/plantillas"
          icono={FileCheck2}
          acento="esmeralda"
        />
        <TarjetaAcceso
          titulo="Mis evidencias"
          descripcion="Consulta, corrige o elimina borradores antes de enviarlos a revisión."
          href="/cargador/evidencias"
          icono={ClipboardCheck}
          detalle={`${enRevision} en revisión`}
          acento="purpura"
        />
      </div>

      {misEvidencias.length > 0 && (
        <TablaEvidencias evidencias={misEvidencias.slice(0, 5)} />
      )}
    </div>
  )
}
