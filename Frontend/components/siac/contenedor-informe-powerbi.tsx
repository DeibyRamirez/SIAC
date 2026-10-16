'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { InformePowerBi } from '@/lib/informes-powerbi'
import {
  obtenerModoPowerBi,
  TIEMPO_MAXIMO_CARGA_INFORME_MS,
  type ModoPowerBi,
} from '@/lib/powerbi/configuracion-powerbi'
import { useUrlPublicaPowerBi } from '@/lib/powerbi/use-url-publica-powerbi'
import { obtenerEmbedPowerBiApi } from '@/lib/servicios/programas.servicio'
import type { RespuestaEmbedPowerBi } from '@/lib/tipos/powerbi'

interface ContenedorInformePowerBiProps {
  informe: InformePowerBi
  /** Modo de integración; por defecto se lee de `POWERBI_MODO` (publico). */
  modo?: ModoPowerBi
  nombrePrograma?: string
  tokenValido?: boolean
  onRestablecerToken?: () => void
  /** Tiempo de espera del iframe público (configurable en pruebas). */
  tiempoMaximoCargaMs?: number
}

/**
 * Muestra el informe embebido de Power BI para la categoría; si no hay URL o falla la carga,
 * informa al usuario (sin gráficos nativos de respaldo).
 */
export function ContenedorInformePowerBi({
  informe,
  modo = obtenerModoPowerBi(),
  nombrePrograma,
  tokenValido = true,
  onRestablecerToken = () => undefined,
  tiempoMaximoCargaMs = TIEMPO_MAXIMO_CARGA_INFORME_MS,
}: ContenedorInformePowerBiProps) {
  if (modo === 'publico') {
    return <InformePowerBiPublico informe={informe} tiempoMaximoCargaMs={tiempoMaximoCargaMs} />
  }
  return (
    <InformePowerBiEmbebidoSimulado
      informe={informe}
      nombrePrograma={nombrePrograma}
      tokenValido={tokenValido}
      onRestablecerToken={onRestablecerToken}
    />
  )
}

function AvisoInformeIndisponible({
  titulo,
  descripcion,
}: {
  titulo: string
  descripcion: string
}) {
  return (
    <Card className="tarjeta-institucional">
      <CardContent className="space-y-2 py-8 text-center" role="status">
        <p className="font-semibold text-primary">{titulo}</p>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
      </CardContent>
    </Card>
  )
}

type EstadoCargaIframe = 'cargando' | 'cargado' | 'fallido'

/** Modo `publico`: iframe con la URL de «Publicar en la web» de la categoría. */
function InformePowerBiPublico({
  informe,
  tiempoMaximoCargaMs,
}: {
  informe: InformePowerBi
  tiempoMaximoCargaMs: number
}) {
  const estadoUrl = useUrlPublicaPowerBi(informe.id)
  const [intento, setIntento] = useState(0)
  const [estadoCarga, setEstadoCarga] = useState<EstadoCargaIframe>('cargando')

  useEffect(() => {
    if (estadoUrl.estado !== 'publicada' || estadoCarga !== 'cargando') return
    const temporizador = window.setTimeout(() => setEstadoCarga('fallido'), tiempoMaximoCargaMs)
    return () => window.clearTimeout(temporizador)
  }, [estadoUrl.estado, estadoCarga, intento, tiempoMaximoCargaMs])

  if (estadoUrl.estado !== 'publicada') {
    const invalida = estadoUrl.estado === 'invalida'
    return (
      <AvisoInformeIndisponible
        titulo="Informe aún no publicado"
        descripcion={
          invalida
            ? `La URL configurada para «${informe.titulo}» no es una URL pública válida de Power BI. Un administrador puede actualizarla en la configuración de informes.`
            : `El informe «${informe.titulo}» todavía no tiene una URL pública configurada. Contacte al administrador del SIAC.`
        }
      />
    )
  }

  const reintentar = () => {
    setEstadoCarga('cargando')
    setIntento((previo) => previo + 1)
  }

  if (estadoCarga === 'fallido') {
    return (
      <div className="space-y-4">
        <Card className="tarjeta-institucional">
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive" role="alert">
              No fue posible cargar el informe «{informe.titulo}» de Power BI o tardó demasiado.
              Si el informe fue republicado, un administrador debe actualizar la URL en el SIAC.
            </p>
            <Button type="button" onClick={reintentar}>
              <RefreshCw className="size-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="tarjeta-visual overflow-hidden bg-white">
      <div className="border-b px-4 py-3 text-sm text-muted-foreground">
        Informe Power BI · {informe.titulo}
        {estadoCarga === 'cargando' ? (
          <span className="ml-2 text-xs" role="status">
            Cargando informe…
          </span>
        ) : null}
      </div>
      <div className="relative aspect-[4/3] w-full sm:aspect-video">
        <iframe
          key={intento}
          title={`Informe Power BI — ${informe.titulo}`}
          src={estadoUrl.url}
          loading="lazy"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
          onLoad={() => setEstadoCarga('cargado')}
        />
      </div>
    </div>
  )
}

/**
 * Modo `embebido` (App Owns Data, T-009.2): bloqueado hasta recibir credenciales Azure.
 */
function InformePowerBiEmbebidoSimulado({
  informe,
  nombrePrograma,
  tokenValido,
  onRestablecerToken,
}: {
  informe: InformePowerBi
  nombrePrograma?: string
  tokenValido: boolean
  onRestablecerToken: () => void
}) {
  const [embed, setEmbed] = useState<RespuestaEmbedPowerBi | null>(null)
  const [cargandoEmbed, setCargandoEmbed] = useState(true)

  const cargarEmbed = useCallback(() => {
    setCargandoEmbed(true)
    obtenerEmbedPowerBiApi(informe.id)
      .then((respuesta) => {
        setEmbed(respuesta?.embedUrl ? respuesta : null)
      })
      .catch(() => {
        setEmbed(null)
      })
      .finally(() => setCargandoEmbed(false))
  }, [informe.id])

  useEffect(() => {
    cargarEmbed()
  }, [cargarEmbed])

  const mostrarIframe = tokenValido && !cargandoEmbed && Boolean(embed?.embedUrl?.length)

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
            loading="lazy"
            allowFullScreen
          />
        </div>
      ) : null}

      {!cargandoEmbed && !mostrarIframe ? (
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
          ) : (
            <AvisoInformeIndisponible
              titulo="Informe embebido no disponible"
              descripcion={`El informe «${informe.titulo}» no está disponible en modo embebido. Use el modo público o configure las credenciales de Azure cuando estén listas.`}
            />
          )}
        </div>
      ) : null}
    </div>
  )
}
