'use client'

import { useCallback, useEffect, useState } from 'react'
import { Settings, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { categoriasInformesPowerBi } from '@/lib/informes-powerbi'
import {
  AVISO_ENLACE_SEGURO_POWERBI,
  extraerUrlPublicaPowerBi,
} from '@/lib/powerbi/configuracion-powerbi'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  actualizarUrlInformePowerBiApi,
  listarInformesPowerBiApi,
  type InformePowerBiMetadatos,
} from '@/lib/servicios/powerbi.servicio'

export function PanelConfiguracionInformesPowerBi() {
  const [panelVisible, setPanelVisible] = useState(true)
  const [metadatos, setMetadatos] = useState<InformePowerBiMetadatos[]>([])
  const [entrada, setEntrada] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!apiDisponible()) return
    try {
      const lista = await listarInformesPowerBiApi()
      setMetadatos(lista)
    } catch {
      toast.error('No se pudo cargar la configuración de informes Power BI.')
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function guardar(categoriaId: string) {
    const valor = entrada[categoriaId]?.trim()
    if (!valor) {
      toast.error('Pegue la URL o el código iframe del informe.')
      return
    }
    if (!extraerUrlPublicaPowerBi(valor)) {
      toast.error(
        'URL no válida. Use https://app.powerbi.com/reportEmbed con reportId y ctid (GUID). «Publicar en la web» (/view?r=) no se acepta.',
      )
      return
    }
    setGuardando(categoriaId)
    try {
      await actualizarUrlInformePowerBiApi(
        categoriaId as (typeof categoriasInformesPowerBi)[number]['id'],
        valor,
      )
      toast.success('Informe actualizado de forma segura en el servidor.')
      setEntrada((prev) => ({ ...prev, [categoriaId]: '' }))
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la URL.')
    } finally {
      setGuardando(null)
    }
  }

  const mapaMeta = new Map(metadatos.map((m) => [m.categoriaId, m]))

  if (!panelVisible) {
    return (
      <div className="flex w-full sm:w-auto">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          aria-expanded={false}
          onClick={() => setPanelVisible(true)}
        >
          <Settings className="size-4" aria-hidden />
          Mostrar configuración de informes
        </Button>
      </div>
    )
  }

  return (
    <Card className="tarjeta-institucional">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <CardTitle className="text-base">Actualizar informes Power BI</CardTitle>
          <p className="text-sm text-muted-foreground">
            Las URL se almacenan en la base de datos con hash de integridad. Solo administradores
            autenticados pueden consultarlas; no se exponen en el código del navegador. Pegue
            el enlace reportEmbed desde Power BI (Incrustar → enlace seguro).
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 self-start text-muted-foreground hover:text-primary"
          aria-expanded={true}
          aria-label="Ocultar configuración de informes Power BI"
          onClick={() => setPanelVisible(false)}
        >
          <X className="size-4" aria-hidden />
          <span className="hidden sm:inline">Ocultar</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {categoriasInformesPowerBi.map((informe) => {
          const meta = mapaMeta.get(informe.id)
          const valor = entrada[informe.id] ?? ''
          const urlDetectada = extraerUrlPublicaPowerBi(valor)
          const avisoVisible = Boolean(urlDetectada)
          const avisoId = `pbi-aviso-${informe.id}`
          return (
            <div
              key={informe.id}
              className="space-y-2 rounded-lg border border-border/80 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-primary">{informe.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {meta?.configurado
                    ? `Configurado · hash ${meta.urlHash?.slice(0, 8)}…`
                    : 'Sin URL en servidor'}
                </p>
              </div>
              <Label className="text-xs" htmlFor={`pbi-${informe.id}`}>
                URL o iframe de Power BI
              </Label>
              <Input
                id={`pbi-${informe.id}`}
                placeholder="https://app.powerbi.com/reportEmbed?reportId=...&ctid=..."
                value={valor}
                aria-describedby={avisoVisible ? avisoId : undefined}
                onChange={(e) =>
                  setEntrada((prev) => ({ ...prev, [informe.id]: e.target.value }))
                }
              />
              {avisoVisible ? (
                <div id={avisoId} className="space-y-1">
                  <p className="text-xs font-medium text-primary">Enlace reportEmbed</p>
                  <p role="note" className="text-xs text-primary">
                    {AVISO_ENLACE_SEGURO_POWERBI}
                  </p>
                </div>
              ) : null}
              <Button
                type="button"
                size="sm"
                disabled={guardando === informe.id}
                onClick={() => guardar(informe.id)}
              >
                {guardando === informe.id ? 'Guardando…' : 'Guardar en servidor'}
              </Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
