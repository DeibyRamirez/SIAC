'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { GuardiaSesion } from '@/components/auth/guardia-sesion'
import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { ShellAplicacion } from '@/components/layout/shell-aplicacion'
import { InsigniaEstado } from '@/components/siac/insignia-estado'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatearFecha, obtenerNombrePrograma } from '@/lib/utilidades-siac'

export default function DictamenPage() {
  return (
    <GuardiaSesion rolPermitido="Revisor">
      <ContenidoDictamen />
    </GuardiaSesion>
  )
}

function ContenidoDictamen() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { datos, dictaminarEvidencia } = usarAlmacen()
  const [observaciones, setObservaciones] = useState('')
  const [mensaje, setMensaje] = useState<string | null>(null)

  const evidencia = useMemo(
    () => datos.evidencias.find((item) => item.id === params.id),
    [datos.evidencias, params.id],
  )

  if (!evidencia) {
    return (
      <ShellAplicacion titulo="Dictamen">
        <EncabezadoPagina
          etiqueta="HU-006"
          titulo="Evidencia no encontrada"
          descripcion="La evidencia solicitada no existe o ya fue dictaminada."
        />
        <Link href="/revisor/bandeja">
          <Button variant="outline">Volver a la bandeja</Button>
        </Link>
      </ShellAplicacion>
    )
  }

  async function aprobar() {
    if (!evidencia) return
    await dictaminarEvidencia(evidencia.id, 'Validado')
    setMensaje('Evidencia aprobada. Estado actualizado a Validado.')
    router.push('/revisor/bandeja')
  }

  async function rechazar() {
    if (!evidencia) return
    if (!observaciones.trim()) {
      setMensaje('Debes registrar observaciones para rechazar la evidencia.')
      return
    }
    await dictaminarEvidencia(evidencia.id, 'Rechazado', observaciones.trim())
    setMensaje('Evidencia rechazada. El Cargador podrá corregirla.')
    router.push('/revisor/bandeja')
  }

  return (
    <ShellAplicacion titulo="Dictamen de revisión">
      <EncabezadoPagina
        etiqueta="HU-006"
        titulo={evidencia.nombre}
        descripcion="Visualiza la evidencia y emite tu dictamen con observaciones si es necesario."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="space-y-4 pt-6 text-sm">
            <div className="rounded-lg border border-dashed bg-muted/40 p-8 text-center">
              <p className="font-medium text-[#102f55]">Visor PDF simulado</p>
              <p className="mt-2 text-muted-foreground">{evidencia.nombreArchivo}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Programa</p>
                <p>{obtenerNombrePrograma(evidencia.programaId)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Periodo</p>
                <p>{evidencia.periodo}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Factor</p>
                <p>{evidencia.factor}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Indicador</p>
                <p>{evidencia.indicador}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Estado</p>
                <InsigniaEstado estado={evidencia.estado} />
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Fecha de carga</p>
                <p>{formatearFecha(evidencia.fechaCarga)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Observaciones</span>
              <textarea
                value={observaciones}
                onChange={(evento) => setObservaciones(evento.target.value)}
                className="min-h-32 w-full rounded-lg border border-input px-3 py-2"
                placeholder="Registra observaciones si rechazas la evidencia."
              />
            </label>
            {mensaje && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{mensaje}</p>
            )}
            <div className="flex flex-col gap-3">
              <Button onClick={aprobar}>Aprobar evidencia</Button>
              <Button variant="destructive" onClick={rechazar}>
                Rechazar con observaciones
              </Button>
              <Link href="/revisor/bandeja">
                <Button variant="outline" className="w-full">
                  Volver
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </ShellAplicacion>
  )
}
