'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErrorApi } from '@/lib/servicios/cliente-api'
import {
  actualizarInsercionPowerBiApi,
  obtenerConfiguracionInsercionPowerBiApi,
  probarConexionPowerBiApi,
  type ConfiguracionInsercionPowerBi,
} from '@/lib/servicios/powerbi.servicio'
import { cn } from '@/lib/utils'

interface TarjetaInsercionPowerBiProps {
  onCambio?: () => void
}

/**
 * Interruptor y identificadores del informe. El secreto de Azure no se muestra:
 * el panel solo indica si está configurado en el servidor.
 */
export function TarjetaInsercionPowerBi({ onCambio }: TarjetaInsercionPowerBiProps) {
  const [config, setConfig] = useState<ConfiguracionInsercionPowerBi | null>(null)
  const [workspaceId, setWorkspaceId] = useState('')
  const [reportId, setReportId] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [probando, setProbando] = useState(false)

  const aplicar = useCallback((datos: ConfiguracionInsercionPowerBi) => {
    setConfig(datos)
    setWorkspaceId(datos.workspaceId ?? '')
    setReportId(datos.reportId ?? '')
  }, [])

  const cargar = useCallback(async () => {
    try {
      aplicar(await obtenerConfiguracionInsercionPowerBiApi())
    } catch {
      toast.error('No se pudo cargar la configuración de Power BI.')
    }
  }, [aplicar])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function persistir(habilitado: boolean): Promise<ConfiguracionInsercionPowerBi | null> {
    setOcupado(true)
    try {
      const datos = await actualizarInsercionPowerBiApi({
        habilitado,
        workspaceId,
        reportId,
      })
      aplicar(datos)
      onCambio?.()
      return datos
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar.'
      toast.error(mensaje)
      return null
    } finally {
      setOcupado(false)
    }
  }

  async function guardar() {
    const habilitado = config?.habilitado ?? false
    const datos = await persistir(habilitado)
    if (!datos) return
    if (datos.habilitado && !datos.activo) {
      toast.message('Configuración incompleta')
      return
    }
    toast.success('Configuración de Power BI guardada.')
  }

  async function alternar() {
    if (!config) return
    const datos = await persistir(!config.habilitado)
    if (!datos) return
    if (datos.habilitado && !datos.activo) {
      toast.message('Configuración incompleta')
    }
  }

  async function probar() {
    setProbando(true)
    setOcupado(true)
    try {
      const datos = await actualizarInsercionPowerBiApi({
        habilitado: config?.habilitado ?? false,
        workspaceId,
        reportId,
      })
      aplicar(datos)
      onCambio?.()
      if (!datos.configuracionCompleta) {
        toast.message('Configuración incompleta')
        return
      }
      await probarConexionPowerBiApi()
      toast.success('La conexión con Power BI respondió correctamente.')
    } catch (error) {
      if (error instanceof ErrorApi && error.codigo === 'POWERBI_CONFIGURACION_INCOMPLETA') {
        toast.message('Configuración incompleta')
        return
      }
      toast.error('No se pudo conectar con Power BI.')
    } finally {
      setProbando(false)
      setOcupado(false)
    }
  }

  const incompleta = Boolean(config?.habilitado && !config.activo)

  return (
    <Card className="tarjeta-institucional">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-base">Power BI</CardTitle>
        <p className="text-sm text-muted-foreground">
          Con el interruptor apagado, los informes públicos siguen igual. El secreto de la entidad
          de servicio se configura en el servidor y no se muestra aquí.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Insertar informe con token</p>
            <p className="text-xs text-muted-foreground">
              Solo Administrador y SuperAdmin. El cambio queda auditado.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config?.habilitado ?? false}
            aria-label="Insertar el informe de Power BI con token"
            disabled={!config || ocupado}
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
              config?.habilitado ? 'bg-primary' : 'bg-muted',
            )}
            onClick={() => void alternar()}
          >
            <span
              className={cn(
                'absolute top-0.5 size-5 rounded-full bg-white shadow',
                config?.habilitado ? 'left-5' : 'left-0.5',
              )}
            />
          </button>
        </div>

        <p className="text-sm">
          Secreto:{' '}
          <span className="font-medium">
            {config?.secretoConfigurado ? 'configurado ✓' : 'no configurado'}
          </span>
        </p>

        {incompleta ? (
          <p className="text-sm text-destructive" role="status">
            Configuración incompleta
            {config && config.faltantes.length > 0 ? ` (${config.faltantes.join(', ')})` : ''}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="powerbi-workspace-id">Id del área de trabajo</Label>
            <Input
              id="powerbi-workspace-id"
              value={workspaceId}
              autoComplete="off"
              spellCheck={false}
              placeholder="00000000-0000-0000-0000-000000000000"
              onChange={(evento) => setWorkspaceId(evento.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="powerbi-report-id">Id del informe</Label>
            <Input
              id="powerbi-report-id"
              value={reportId}
              autoComplete="off"
              spellCheck={false}
              placeholder="00000000-0000-0000-0000-000000000000"
              onChange={(evento) => setReportId(evento.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" disabled={ocupado || !config} onClick={() => void guardar()}>
            Guardar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={ocupado || !config}
            onClick={() => void probar()}
          >
            {probando ? 'Probando…' : 'Probar conexión'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
