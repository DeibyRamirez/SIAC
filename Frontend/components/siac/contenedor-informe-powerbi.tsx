'use client'

import { useCallback, useEffect, useState } from 'react'

import { PanelCifrasEstudiantes } from '@/components/siac/panel-cifras-estudiantes'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { InformePowerBi } from '@/lib/informes-powerbi'
import { obtenerEmbedPowerBiApi } from '@/lib/servicios/programas.servicio'
import type { RespuestaEmbedPowerBi } from '@/lib/tipos/cifras'

interface ContenedorInformePowerBiProps {
  informe: InformePowerBi
  nombrePrograma?: string
  tokenValido: boolean
  onRestablecerToken: () => void
}

export function ContenedorInformePowerBi({
  informe,
  nombrePrograma,
  tokenValido,
  onRestablecerToken,
}: ContenedorInformePowerBiProps) {
  const [embed, setEmbed] = useState<RespuestaEmbedPowerBi | null>(null)
  const [errorEmbed, setErrorEmbed] = useState<string | null>(null)
  const [cargandoEmbed, setCargandoEmbed] = useState(true)

  const cargarEmbed = useCallback(() => {
    if (informe.id !== 'estudiantes') {
      setCargandoEmbed(false)
      return
    }

    setCargandoEmbed(true)
    setErrorEmbed(null)
    obtenerEmbedPowerBiApi(informe.id)
      .then(setEmbed)
      .catch((err: Error) => {
        setEmbed(null)
        setErrorEmbed(err.message ?? 'No fue posible obtener el embed de Power BI.')
      })
      .finally(() => setCargandoEmbed(false))
  }, [informe.id])

  useEffect(() => {
    cargarEmbed()
  }, [cargarEmbed])

  if (informe.id !== 'estudiantes') {
    return (
      <Card className="tarjeta-institucional">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          El informe «{informe.titulo}» estará disponible en un sprint posterior.
        </CardContent>
      </Card>
    )
  }

  const mostrarIframe =
    tokenValido && !cargandoEmbed && Boolean(embed?.embedUrl?.length)

  const mostrarFallbackNativo =
    !mostrarIframe &&
    (!tokenValido || Boolean(errorEmbed) || (!cargandoEmbed && !embed?.embedUrl?.length))

  return (
    <div className="space-y-4">
      {cargandoEmbed ? (
        <div
          className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-muted-foreground"
          role="status"
        >
          Preparando informe de Power BI…
        </div>
      ) : null}

      {mostrarIframe ? (
        <div className="tarjeta-visual overflow-hidden bg-white">
          <div className="border-b px-4 py-3 text-sm text-muted-foreground">
            Informe embebido · {nombrePrograma ?? 'Institucional'} · {informe.titulo}
            {embed?.mensaje ? (
              <span className="mt-1 block text-xs text-ocre">{embed.mensaje}</span>
            ) : null}
          </div>
          <iframe
            title={`Informe Power BI — ${informe.titulo}`}
            src={embed!.embedUrl}
            className="min-h-[520px] w-full border-0"
            allowFullScreen
          />
        </div>
      ) : null}

      {mostrarFallbackNativo ? (
        <div className="space-y-4">
          {!tokenValido ? (
            <Card className="tarjeta-institucional">
              <CardContent className="space-y-4 pt-6">
                <p className="text-sm text-destructive">
                  No fue posible cargar el informe de Power BI. El token embebido expiró o no está
                  disponible.
                </p>
                <Button type="button" onClick={onRestablecerToken}>
                  Reintentar carga del informe
                </Button>
              </CardContent>
            </Card>
          ) : errorEmbed ? (
            <p className="text-sm text-destructive">{errorEmbed}</p>
          ) : null}

          <PanelCifrasEstudiantes
            mensajeEncabezado={
              !tokenValido
                ? 'Vista alternativa con métricas SIAC mientras se restablece el informe embebido.'
                : embed?.fallback
                  ? 'Vista alternativa con datos del API institucional (semilla de desarrollo).'
                  : undefined
            }
          />
        </div>
      ) : null}
    </div>
  )
}
