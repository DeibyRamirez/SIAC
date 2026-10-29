export interface DatosInsercionInforme {
  token: string
  embedUrl: string
  reportId: string
}

export interface InformeIncrustado {
  fijarToken(token: string): Promise<void>
  destruir(): void
}

type ServicioIncrustacion = {
  embed: (contenedor: HTMLElement, configuracion: Record<string, unknown>) => {
    setAccessToken: (token: string) => Promise<void>
  }
  reset: (contenedor: HTMLElement) => void
}

let servicio: ServicioIncrustacion | null = null

async function obtenerServicio(): Promise<ServicioIncrustacion> {
  if (servicio) return servicio
  const pbi = await import('powerbi-client')
  servicio = new pbi.service.Service(
    pbi.factories.hpmFactory,
    pbi.factories.wpmpFactory,
    pbi.factories.routerFactory,
  ) as ServicioIncrustacion
  return servicio
}

/**
 * Incrusta el informe con el SDK de Power BI. El token no se guarda en localStorage:
 * vive solo en la instancia del informe y se reemplaza con setAccessToken.
 */
export async function incrustarInformePowerBi(
  contenedor: HTMLElement,
  datos: DatosInsercionInforme,
): Promise<InformeIncrustado> {
  const pbi = await import('powerbi-client')
  const instancia = await obtenerServicio()
  const informe = instancia.embed(contenedor, {
    type: 'report',
    id: datos.reportId,
    embedUrl: datos.embedUrl,
    accessToken: datos.token,
    tokenType: pbi.models.TokenType.Embed,
    permissions: pbi.models.Permissions.Read,
    settings: {
      panes: {
        filters: { visible: false },
      },
    },
  })

  return {
    async fijarToken(token: string) {
      await informe.setAccessToken(token)
    },
    destruir() {
      instancia.reset(contenedor)
    },
  }
}
