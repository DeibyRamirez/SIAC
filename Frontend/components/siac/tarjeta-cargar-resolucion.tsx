'use client'

import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cargarResolucionMenApi } from '@/lib/servicios/resolucion-men.servicio'

/** Mismo límite que el backend para la resolución MEN. */
export const TAMANO_MAXIMO_RESOLUCION_MB = 20

/** Fecha local de hoy en formato AAAA-MM-DD (tope del selector de fecha). */
function hoyIso(): string {
  const ahora = new Date()
  const desfase = ahora.getTimezoneOffset() * 60_000
  return new Date(ahora.getTime() - desfase).toISOString().slice(0, 10)
}

/** Validación previa en el navegador; el backend vuelve a validar MIME y firma %PDF. */
export function motivoRechazoArchivoResolucion(archivo: File | null): string | null {
  if (!archivo) return 'Adjunte el PDF de la resolución MEN.'
  if (!archivo.name.toLowerCase().endsWith('.pdf')) return 'La resolución MEN debe ser un archivo .pdf.'
  if (archivo.size > TAMANO_MAXIMO_RESOLUCION_MB * 1024 * 1024) {
    return `La resolución MEN supera el tamaño máximo de ${TAMANO_MAXIMO_RESOLUCION_MB} MB.`
  }
  return null
}

interface TarjetaCargarResolucionProps {
  /** Sin programaId se carga la resolución de la institución. */
  programaId?: string
  puedeCargar: boolean
  documentosPendientes: string[]
  onCargada: () => void | Promise<void>
}

/**
 * «Cargar resolución MEN» (reemplaza «Activar vigencia»): el Administrador registra el número,
 * la fecha real y el PDF. El botón queda deshabilitado mientras haya documentos sin aprobar.
 */
export function TarjetaCargarResolucion({
  programaId,
  puedeCargar,
  documentosPendientes,
  onCargada,
}: TarjetaCargarResolucionProps) {
  const [numero, setNumero] = useState('')
  const [fecha, setFecha] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)

  const formularioCompleto = numero.trim() !== '' && fecha !== '' && archivo !== null
  const deshabilitado = !puedeCargar || enviando || !formularioCompleto

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const motivo = motivoRechazoArchivoResolucion(archivo)
    if (motivo) {
      toast.error(motivo)
      return
    }
    if (fecha > hoyIso()) {
      toast.error('La fecha de la resolución no puede estar en el futuro.')
      return
    }
    setEnviando(true)
    try {
      const registrada = await cargarResolucionMenApi(
        programaId ? { programaId } : { institucion: true },
        { numero, fechaResolucion: fecha, archivo: archivo as File },
      )
      toast.success(
        `Resolución MEN n.º ${registrada.numero} registrada. Vigencia hasta ${registrada.fechaFinVigencia.slice(0, 10)}.`,
      )
      await onCargada()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la resolución.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cargar resolución MEN</CardTitle>
      </CardHeader>
      <CardContent>
        {!puedeCargar ? (
          <p className="mb-4 text-sm text-muted-foreground" role="status">
            Se habilita cuando todos los documentos del trámite estén aprobados. Pendientes:{' '}
            {documentosPendientes.length ? documentosPendientes.join(', ') : '—'}.
          </p>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">
            Registre la fecha y el número reales de la resolución. La vigencia termina 7 años después de esa fecha.
          </p>
        )}
        <form className="grid gap-4 sm:grid-cols-3" onSubmit={manejarEnvio}>
          <div className="space-y-2">
            <Label htmlFor="numero-resolucion">Número de resolución</Label>
            <Input
              id="numero-resolucion"
              value={numero}
              maxLength={60}
              disabled={!puedeCargar}
              onChange={(e) => setNumero(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fecha-resolucion">Fecha de la resolución</Label>
            <Input
              id="fecha-resolucion"
              type="date"
              max={hoyIso()}
              value={fecha}
              disabled={!puedeCargar}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="archivo-resolucion">PDF de la resolución</Label>
            <Input
              id="archivo-resolucion"
              type="file"
              accept=".pdf,application/pdf"
              disabled={!puedeCargar}
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={deshabilitado}>
              {enviando ? 'Cargando…' : 'Cargar resolución'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
