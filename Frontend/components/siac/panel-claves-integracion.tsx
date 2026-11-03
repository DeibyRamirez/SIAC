'use client'

import { Copy, KeyRound } from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { DialogoConfirmacion } from '@/components/siac/dialogo-confirmacion'
import { MensajeCargando } from '@/components/siac/estado-carga-lista'
import { EncabezadoPagina, PanelVacio } from '@/components/siac/tarjeta-acceso'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usarCargaConSesion } from '@/lib/hooks/usar-carga-con-sesion'
import {
  crearIntegradorApi,
  listarIntegradoresApi,
  revocarIntegradorApi,
  type IntegradorApi,
} from '@/lib/servicios/integradores.servicio'

function fechaVisible(valor: string | null): string {
  if (!valor) return '—'
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

export function PanelClavesIntegracion() {
  const [integradores, setIntegradores] = useState<IntegradorApi[]>([])
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [claveUnaVez, setClaveUnaVez] = useState<string | null>(null)
  const [idRevocar, setIdRevocar] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      setIntegradores(await listarIntegradoresApi())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las claves.')
    } finally {
      setCargando(false)
    }
  }, [])

  usarCargaConSesion(cargar)

  async function crear(evento: React.FormEvent) {
    evento.preventDefault()
    const limpio = nombre.trim()
    if (limpio.length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres.')
      return
    }
    setGuardando(true)
    try {
      const creado = await crearIntegradorApi(limpio)
      setClaveUnaVez(creado.clave)
      setNombre('')
      toast.success('Clave creada. Cópiela ahora: no se volverá a mostrar.')
      await cargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear la clave.')
    } finally {
      setGuardando(false)
    }
  }

  async function copiar() {
    if (!claveUnaVez) return
    try {
      await navigator.clipboard.writeText(claveUnaVez)
      toast.success('Clave copiada.')
    } catch {
      toast.error('No se pudo copiar la clave. Selecciónela y cópiela a mano.')
    }
  }

  async function revocar() {
    if (!idRevocar) return
    try {
      await revocarIntegradorApi(idRevocar)
      toast.success('Clave revocada.')
      setIdRevocar(null)
      await cargar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo revocar la clave.')
    }
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Integración"
        titulo="Claves de cifras institucionales"
        descripcion="Cada proyecto externo usa su propia clave. Se muestra una sola vez y en la base solo queda el hash."
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <form onSubmit={crear} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1 space-y-2 text-sm">
              <span className="font-medium">Nombre del integrador</span>
              <Input
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
                placeholder="SIGA"
                maxLength={120}
                aria-label="Nombre del integrador"
              />
            </label>
            <Button type="submit" disabled={guardando}>
              <KeyRound className="size-4" />
              {guardando ? 'Creando…' : 'Crear clave'}
            </Button>
          </form>

          {claveUnaVez ? (
            <div className="space-y-2 rounded-lg border border-primary/20 bg-accent p-3" role="status">
              <p className="text-sm font-medium text-primary">
                Esta clave no se volverá a mostrar. Cópiela y entréguela al proyecto.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input readOnly value={claveUnaVez} aria-label="Clave de API" className="font-mono" />
                <Button type="button" variant="outline" onClick={copiar}>
                  <Copy className="size-4" />
                  Copiar clave
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {cargando ? (
        <MensajeCargando texto="Cargando claves…" filas={4} columnas={4} />
      ) : integradores.length === 0 ? (
        <PanelVacio mensaje="Todavía no hay integradores." />
      ) : (
        <div className="tabla-institucional overflow-x-auto rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último uso</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integradores.map((integrador) => (
                <TableRow key={integrador.id}>
                  <TableCell className="font-medium">{integrador.nombre}</TableCell>
                  <TableCell>
                    <Badge variant={integrador.activo ? 'default' : 'secondary'}>
                      {integrador.activo ? 'Activa' : 'Revocada'}
                    </Badge>
                  </TableCell>
                  <TableCell>{fechaVisible(integrador.ultimoUsoEn)}</TableCell>
                  <TableCell className="text-right">
                    {integrador.activo ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-fucsia/30 text-fucsia"
                        onClick={() => setIdRevocar(integrador.id)}
                      >
                        Revocar
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {fechaVisible(integrador.revocadoEn)}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DialogoConfirmacion
        abierto={idRevocar !== null}
        titulo="Revocar clave"
        descripcion="El proyecto dejará de poder enviar y consultar cifras. Las filas ya guardadas se conservan."
        etiquetaConfirmar="Sí, revocar"
        variant="destructive"
        onConfirmar={revocar}
        onCancelar={() => setIdRevocar(null)}
      />
    </div>
  )
}
