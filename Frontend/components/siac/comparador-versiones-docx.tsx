'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ImageIcon,
  MessageSquarePlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  obtenerDiffVersionesApi,
  type DiffVersionesApi,
  type HunkDiffApi,
  type LineaDiffApi,
  type MediaDiffApi,
} from '@/lib/servicios/evidencias.servicio'
import type { ComentarioInlineRevision } from '@/lib/hooks/usar-borrador-revision-docx'
import { cn } from '@/lib/utils'

interface ComparadorVersionesDocxProps {
  evidenciaId: string
  versionA: number
  versionB: number
  permitirComentarios?: boolean
  comentarios?: ComentarioInlineRevision[]
  onComentariosChange?: (comentarios: ComentarioInlineRevision[]) => void
  className?: string
}

function nuevoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `comentario-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function clasesLinea(tipo: LineaDiffApi['tipo']): string {
  if (tipo === 'agregado') return 'bg-emerald-50 text-emerald-900'
  if (tipo === 'eliminado') return 'bg-red-50 text-red-900'
  return 'text-muted-foreground'
}

function marcaLinea(tipo: LineaDiffApi['tipo']): string {
  if (tipo === 'agregado') return '+'
  if (tipo === 'eliminado') return '-'
  return ' '
}

function etiquetaMedia(estado: MediaDiffApi['estado']): {
  texto: string
  clase: string
} {
  switch (estado) {
    case 'agregado':
      return { texto: 'Imagen agregada', clase: 'bg-emerald-100 text-emerald-800' }
    case 'eliminado':
      return { texto: 'Imagen eliminada', clase: 'bg-red-100 text-red-800' }
    case 'modificado':
      return { texto: 'Imagen modificada', clase: 'bg-amber-100 text-amber-800' }
    default:
      return { texto: 'Sin cambios', clase: 'bg-muted text-muted-foreground' }
  }
}

export function ComparadorVersionesDocx({
  evidenciaId,
  versionA,
  versionB,
  permitirComentarios = false,
  comentarios = [],
  onComentariosChange,
  className,
}: ComparadorVersionesDocxProps) {
  const [diff, setDiff] = useState<DiffVersionesApi | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hunkComentando, setHunkComentando] = useState<string | null>(null)
  const [textoNuevo, setTextoNuevo] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [textoEdicion, setTextoEdicion] = useState('')

  useEffect(() => {
    let cancelado = false
    async function cargar() {
      setCargando(true)
      setError(null)
      try {
        const resultado = await obtenerDiffVersionesApi(
          evidenciaId,
          versionA,
          versionB,
        )
        if (!cancelado) setDiff(resultado)
      } catch (err) {
        if (!cancelado) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo comparar las versiones.',
          )
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    }
    cargar()
    return () => {
      cancelado = true
    }
  }, [evidenciaId, versionA, versionB])

  const guardarComentario = useCallback(
    (hunk: HunkDiffApi) => {
      const texto = textoNuevo.trim()
      if (!texto || !onComentariosChange) return
      const cita = hunk.lineas
        .filter((l) => l.tipo === 'agregado')
        .map((l) => l.texto)
        .join(' ')
        .slice(0, 160)
      const ahora = new Date().toISOString()
      onComentariosChange([
        ...comentarios,
        {
          id: nuevoId(),
          hunkId: hunk.id,
          quote: cita || undefined,
          body: texto,
          createdAt: ahora,
          updatedAt: ahora,
        },
      ])
      setTextoNuevo('')
      setHunkComentando(null)
    },
    [comentarios, onComentariosChange, textoNuevo],
  )

  const eliminarComentario = useCallback(
    (id: string) => {
      if (!onComentariosChange) return
      onComentariosChange(comentarios.filter((c) => c.id !== id))
    },
    [comentarios, onComentariosChange],
  )

  const confirmarEdicion = useCallback(
    (id: string) => {
      const texto = textoEdicion.trim()
      if (!texto || !onComentariosChange) return
      onComentariosChange(
        comentarios.map((c) =>
          c.id === id ? { ...c, body: texto, updatedAt: new Date().toISOString() } : c,
        ),
      )
      setEditandoId(null)
      setTextoEdicion('')
    },
    [comentarios, onComentariosChange, textoEdicion],
  )

  if (cargando) {
    return (
      <p className="text-sm text-muted-foreground">Comparando versiones…</p>
    )
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
    )
  }

  if (!diff) return null

  const mediaConCambios = diff.media.filter((m) => m.estado !== 'sinCambios')
  const mediaSinCambios = diff.media.length - mediaConCambios.length

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          v{diff.versionA} → v{diff.versionB}
        </Badge>
        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
          +{diff.agregadas}
        </span>
        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
          -{diff.eliminadas}
        </span>
        {diff.sinCambios && (
          <span className="text-xs text-muted-foreground">
            Sin diferencias de contenido.
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {diff.nombreArchivoA} → {diff.nombreArchivoB}
      </p>

      {(mediaConCambios.length > 0 || mediaSinCambios > 0) && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Imágenes del documento
          </p>
          {mediaConCambios.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin cambios en {diff.media.length} imagen(es).
            </p>
          ) : (
            <ul className="space-y-1">
              {mediaConCambios.map((media) => {
                const etiqueta = etiquetaMedia(media.estado)
                return (
                  <li
                    key={media.part}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{media.part}</span>
                    </span>
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-xs font-medium',
                        etiqueta.clase,
                      )}
                    >
                      {etiqueta.texto}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          {mediaSinCambios > 0 && (
            <p className="text-xs text-muted-foreground">
              {mediaSinCambios} imagen(es) sin cambios.
            </p>
          )}
        </div>
      )}

      {diff.hunks.map((hunk) => {
        const comentariosHunk = comentarios.filter((c) => c.hunkId === hunk.id)
        return (
          <div key={hunk.id} className="overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between gap-2 bg-muted/60 px-3 py-1.5">
              <code className="text-xs text-muted-foreground">{hunk.encabezado}</code>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-emerald-700">+{hunk.agregadas}</span>
                <span className="text-red-700">-{hunk.eliminadas}</span>
              </div>
            </div>
            <div className="divide-y">
              {hunk.lineas.map((linea, indice) => (
                <div
                  key={`${hunk.id}-${indice}`}
                  className={cn(
                    'flex gap-2 px-3 py-0.5 font-mono text-xs',
                    clasesLinea(linea.tipo),
                  )}
                >
                  <span className="w-10 shrink-0 select-none text-right text-muted-foreground/70">
                    {linea.numeroAntes ?? ''}
                  </span>
                  <span className="w-10 shrink-0 select-none text-right text-muted-foreground/70">
                    {linea.numeroDespues ?? ''}
                  </span>
                  <span className="w-3 shrink-0 select-none">
                    {marcaLinea(linea.tipo)}
                  </span>
                  <span className="whitespace-pre-wrap break-words">
                    {linea.texto}
                  </span>
                </div>
              ))}
            </div>

            {permitirComentarios && hunk.agregadas > 0 && (
              <div className="space-y-2 border-t bg-muted/20 px-3 py-2">
                {comentariosHunk.map((comentario) => (
                  <div
                    key={comentario.id}
                    className="rounded-lg border border-fucsia/30 bg-white p-2"
                  >
                    {editandoId === comentario.id ? (
                      <div className="space-y-2">
                        <Textarea
                          className="min-h-[64px] text-sm"
                          value={textoEdicion}
                          onChange={(e) => setTextoEdicion(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => confirmarEdicion(comentario.id)}
                          >
                            Guardar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditandoId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {comentario.quote && (
                          <p className="mb-1 border-l-2 border-emerald-400 pl-2 text-xs italic text-muted-foreground">
                            «{comentario.quote}»
                          </p>
                        )}
                        <p className="whitespace-pre-line text-sm">
                          {comentario.body}
                        </p>
                        <div className="mt-1 flex gap-2">
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setEditandoId(comentario.id)
                              setTextoEdicion(comentario.body)
                            }}
                          >
                            <Pencil className="size-3" /> Editar
                          </button>
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => eliminarComentario(comentario.id)}
                          >
                            <Trash2 className="size-3" /> Eliminar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {hunkComentando === hunk.id ? (
                  <div className="space-y-2">
                    <Textarea
                      className="min-h-[64px] text-sm"
                      placeholder="Comentario sobre este cambio agregado."
                      value={textoNuevo}
                      onChange={(e) => setTextoNuevo(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => guardarComentario(hunk)}>
                        Guardar comentario
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setHunkComentando(null)
                          setTextoNuevo('')
                        }}
                      >
                        <X className="size-3" /> Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs font-medium text-fucsia hover:underline"
                    onClick={() => {
                      setHunkComentando(hunk.id)
                      setTextoNuevo('')
                    }}
                  >
                    {comentariosHunk.length > 0 ? (
                      <>
                        <Plus className="size-3" /> Añadir otro comentario
                      </>
                    ) : (
                      <>
                        <MessageSquarePlus className="size-3" /> Comentar este cambio
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
