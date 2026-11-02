'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { usarSesion } from '@/components/auth/proveedor-sesion'
import { RegionCarga } from '@/components/siac/estado-carga-lista'
import { EsqueletoCampos } from '@/components/siac/esqueletos'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  actualizarUmbralesVigenciaApi,
  obtenerUmbralesVigenciaApi,
} from '@/lib/servicios/configuracion.servicio'
import {
  MAX_MESES_UMBRAL_VIGENCIA,
  validarUmbralesVigencia,
} from '@/lib/utilidades/umbrales-vigencia'

/**
 * T-007.3a: tarjeta «Umbrales del semáforo» para SuperAdmin/Administrador.
 * Valida en cliente igual que el DTO del backend y persiste vía PATCH; el siguiente cálculo
 * del semáforo (cron o demo) relee la BD, así que no hace falta redeploy.
 */
export function TarjetaUmbralesSemaforo() {
  const { sesion } = usarSesion()
  const autorizado = sesion?.rol === 'Administrador' || sesion?.rol === 'SuperAdmin'
  const [mesesAviso, setMesesAviso] = useState('')
  const [mesesRojo, setMesesRojo] = useState('')
  const [aniosVigencia, setAniosVigencia] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!autorizado) return
    let vigente = true
    setCargando(true)
    obtenerUmbralesVigenciaApi()
      .then((umbrales) => {
        if (!vigente) return
        setMesesAviso(String(umbrales.mesesAvisoVigencia))
        setMesesRojo(String(umbrales.mesesRojoVigencia))
        setAniosVigencia(umbrales.aniosVigencia)
        setError(null)
      })
      .catch((err) => {
        if (!vigente) return
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los umbrales.')
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [autorizado])

  if (!autorizado) return null

  async function guardar() {
    const aviso = Number(mesesAviso)
    const rojo = Number(mesesRojo)
    const mensajeValidacion = validarUmbralesVigencia(aviso, rojo)
    if (mensajeValidacion) {
      setError(mensajeValidacion)
      toast.error(mensajeValidacion)
      return
    }
    setGuardando(true)
    try {
      const umbrales = await actualizarUmbralesVigenciaApi({
        mesesAvisoVigencia: aviso,
        mesesRojoVigencia: rojo,
      })
      setMesesAviso(String(umbrales.mesesAvisoVigencia))
      setMesesRojo(String(umbrales.mesesRojoVigencia))
      setError(null)
      toast.success('Umbrales del semáforo actualizados.')
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No se pudieron guardar los umbrales.'
      setError(mensaje)
      toast.error(mensaje)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card>
      <CardHeader className="border-b border-primary/10 bg-white/60">
        <CardTitle>Umbrales del semáforo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <p className="text-sm text-muted-foreground">
          Meses antes del fin de vigencia para el aviso amarillo y el rojo
          {aniosVigencia ? ` (vigencia completa de ${aniosVigencia} años = ${aniosVigencia * 12} meses)` : ''}.
          El aviso debe ser mayor que el rojo; los cambios aplican al siguiente cálculo, sin
          redeploy.
        </p>
        {cargando ? (
          <RegionCarga texto="Cargando umbrales…">
            <EsqueletoCampos campos={2} columnas="sm:grid-cols-2" />
          </RegionCarga>
        ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="umbral-aviso">Aviso amarillo (meses)</Label>
            <Input
              id="umbral-aviso"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_MESES_UMBRAL_VIGENCIA}
              value={mesesAviso}
              onChange={(evento) => setMesesAviso(evento.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="umbral-rojo">Rojo (meses)</Label>
            <Input
              id="umbral-rojo"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_MESES_UMBRAL_VIGENCIA}
              value={mesesRojo}
              onChange={(evento) => setMesesRojo(evento.target.value)}
            />
          </div>
        </div>
        )}
        {error ? (
          <p role="alert" className="text-sm text-coral">
            {error}
          </p>
        ) : null}
        <Button onClick={guardar} disabled={cargando || guardando}>
          {guardando ? 'Guardando…' : 'Guardar umbrales'}
        </Button>
      </CardContent>
    </Card>
  )
}
