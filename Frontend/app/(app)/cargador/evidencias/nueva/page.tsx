'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  factoresSemilla,
  periodosSemilla,
  programasSemilla,
} from '@/lib/datos-semilla'
import { listarProgramasApi } from '@/lib/servicios/programas.servicio'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import type { Programa } from '@/lib/tipos'

export default function NuevaEvidenciaPage() {
  return (
    <PlantillaPaginaApp titulo="Cargar evidencia" rol="Cargador">
      <ContenidoNuevaEvidencia />
    </PlantillaPaginaApp>
  )
}

function ContenidoNuevaEvidencia() {
  const router = useRouter()
  const { sesion } = usarSesion()
  const { crearEvidencia } = usarAlmacen()
  const [programas, setProgramas] = useState<Programa[]>(programasSemilla)
  const [nombre, setNombre] = useState('')
  const [programaId, setProgramaId] = useState(programasSemilla[0]?.id ?? '')
  const [periodo, setPeriodo] = useState(periodosSemilla[3] ?? '2026-1')
  const [factor, setFactor] = useState(factoresSemilla[0] ?? '')
  const [indicador, setIndicador] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!apiDisponible()) return
    listarProgramasApi()
      .then((lista) => {
        if (lista.length > 0) {
          setProgramas(lista)
          setProgramaId(lista[0].id)
        }
      })
      .catch(() => {
        // Mantiene semilla local
      })
  }, [])

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)

    if (!nombre.trim() || !indicador.trim() || !archivo) {
      setError('Completa todos los campos y selecciona un archivo.')
      return
    }

    const extension = archivo.name.split('.').pop()?.toLowerCase()
    if (extension !== 'pdf' && extension !== 'xlsx') {
      setError('Solo se permiten archivos PDF o Excel (.xlsx).')
      return
    }

    if (archivo.size > 20 * 1024 * 1024) {
      setError('El archivo supera el tamaño máximo permitido (20 MB).')
      return
    }

    setEnviando(true)
    try {
      await crearEvidencia(
        {
          nombre: nombre.trim(),
          programaId,
          periodo,
          factor,
          indicador: indicador.trim(),
          autorId: sesion?.usuarioId ?? 'usr-cargador',
          nombreArchivo: archivo.name,
        },
        archivo,
      )
      router.push('/cargador/evidencias')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la evidencia.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="HU-003"
        titulo="Cargar evidencia"
        descripcion="Registra una evidencia en PDF o Excel con los metadatos exigidos por Planeación."
      />

      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={manejarEnvio}>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Nombre del documento</span>
              <input
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
                className="w-full rounded-lg border border-input px-3 py-2"
                placeholder="Ej. Informe de autoevaluación"
                required
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Programa</span>
                <select
                  value={programaId}
                  onChange={(evento) => setProgramaId(evento.target.value)}
                  className="w-full rounded-lg border border-input px-3 py-2"
                >
                  {programas.map((programa) => (
                    <option key={programa.id} value={programa.id}>
                      {programa.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Periodo</span>
                <select
                  value={periodo}
                  onChange={(evento) => setPeriodo(evento.target.value)}
                  className="w-full rounded-lg border border-input px-3 py-2"
                >
                  {periodosSemilla.map((valor) => (
                    <option key={valor} value={valor}>
                      {valor}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Factor</span>
              <select
                value={factor}
                onChange={(evento) => setFactor(evento.target.value)}
                className="w-full rounded-lg border border-input px-3 py-2"
              >
                {factoresSemilla.map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Indicador</span>
              <input
                value={indicador}
                onChange={(evento) => setIndicador(evento.target.value)}
                className="w-full rounded-lg border border-input px-3 py-2"
                placeholder="Ej. Indicador 4.1 · Pertinencia curricular"
                required
              />
            </label>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Archivo</span>
              <input
                type="file"
                accept=".pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(evento) => setArchivo(evento.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-dashed border-input px-3 py-3"
                required
              />
              <span className="text-xs text-muted-foreground">PDF o XLSX · máximo 25 MB</span>
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={enviando}>
                {enviando ? 'Guardando…' : 'Guardar borrador'}
              </Button>
              <Link href="/cargador/evidencias">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
