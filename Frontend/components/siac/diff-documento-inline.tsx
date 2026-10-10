'use client'

import { Fragment, useCallback, useState } from 'react'
import { MessageSquarePlus, Pencil, Plus, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ComentarioInlineRevision } from '@/lib/hooks/usar-borrador-revision-docx'
import type {
  DiffVersionesApi,
  HunkDiffApi,
  MediaDiffApi,
} from '@/lib/servicios/evidencias.servicio'
import { cn } from '@/lib/utils'

interface DiffDocumentoInlineProps {
  diff: DiffVersionesApi
  permitirComentarios?: boolean
  comentarios?: ComentarioInlineRevision[]
  onComentariosChange?: (comentarios: ComentarioInlineRevision[]) => void
}

function nuevoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `comentario-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function chipMedia(estado: MediaDiffApi['estado']): string {
  switch (estado) {
    case 'agregado':
      return 'bg-emerald-100 text-emerald-800'
    case 'eliminado':
      return 'bg-red-100 text-red-700'
    case 'modificado':
      return 'bg-amber-100 text-amber-800'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function etiquetaMedia(estado: MediaDiffApi['estado']): string {
  switch (estado) {
    case 'agregado':
      return 'imagen agregada'
    case 'eliminado':
      return 'imagen eliminada'
    case 'modificado':
      return 'imagen modificada'
    default:
      return 'sin cambios'
  }
}

/**
 * Render tipo Google Docs: documento COMPLETO en flujo continuo con marcas
 * inline (eliminado rojo tachado / agregado verde) y comentarios anclados a
 * los hunks verdes. No es una lista de hunks aislada.
 */
export function DiffDocumentoInline({
  diff,
  permitirComentarios = false,
  comentarios = [],
  onComentariosChange,
}: DiffDocumentoInlineProps) {
  const [hunkComentando, setHunkComentando] = useState<string | null>(null)
  const [textoNuevo, setTextoNuevo] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [textoEdicion, setTextoEdicion] = useState('')

  const lineasDocumento =
    diff.lineas && diff.lineas.length > 0
      ? diff.lineas
      : diff.hunks.flatMap((h) => h.lineas)

  const hunkPorUltimaLinea = new Map<number, HunkDiffApi>()
  for (const hunk of diff.hunks) {
    hunkPorUltimaLinea.set(hunk.indiceInicio + hunk.lineas.length - 1, hunk)
  }

  const mediaCambios = diff.media.filter((m) => m.estado !== 'sinCambios')

  const guardarComentario = useCallback(
    (hunkId: string, quote: string) => {
      const texto = textoNuevo.trim()
      if (!texto || !onComentariosChange) return
      const ahora = new Date().toISOString()
      onComentariosChange([
        ...comentarios,
        {
          id: nuevoId(),
          hunkId,
          quote: quote || undefined,
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
          c.id === id
            ? { ...c, body: texto, updatedAt: new Date().toISOString() }
            : c,
        ),
      )
      setEditandoId(null)
      setTextoEdicion('')
    },
    [comentarios, onComentariosChange, textoEdicion],
  )

  function comentariosDelHunk(hunk: HunkDiffApi) {
    if (!permitirComentarios || hunk.agregadas === 0) return null
    const comentariosHunk = comentarios.filter((c) => c.hunkId === hunk.id)
    const quoteHunk = hunk.lineas
      .filter((l) => l.tipo === 'agregado')
      .map((l) => l.texto)
      .join(' ')
      .slice(0, 160)

    return (
      <div className="my-2 space-y-2 rounded-lg border border-fucsia/25 bg-fucsia/5 p-2">
        {comentariosHunk.map((comentario) => (
          <div
            key={comentario.id}
            className="rounded border border-fucsia/20 bg-white p-2"
          >
            {editandoId === comentario.id ? (
              <div className="space-y-2">
                <Textarea
                  className="min-h-[56px] text-sm"
                  value={textoEdicion}
                  onChange={(e) => setTextoEdicion(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => confirmarEdicion(comentario.id)}>
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
                <p className="whitespace-pre-line text-sm">{comentario.body}</p>
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
              className="min-h-[56px] text-sm"
              placeholder="Comentario sobre este cambio agregado."
              value={textoNuevo}
              onChange={(e) => setTextoNuevo(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => guardarComentario(hunk.id, quoteHunk)}>
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
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-5 text-[15px] leading-7 text-zinc-800">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
          +{diff.agregadas}
        </span>
        <span className="rounded bg-red-100 px-2 py-0.5 font-semibold text-red-700">
          -{diff.eliminadas}
        </span>
        {diff.sinCambios && (
          <span className="text-muted-foreground">Sin diferencias de contenido.</span>
        )}
        <span className="text-muted-foreground">
          Eliminado en rojo tachado, agregado resaltado en verde.
        </span>
      </div>

      <div className="space-y-0.5">
        {lineasDocumento.map((linea, indice) => {
          const hunk = hunkPorUltimaLinea.get(indice)
          return (
            <Fragment key={`${indice}-${linea.tipo}`}>
              <p
                className={cn(
                  'whitespace-pre-wrap break-words',
                  linea.tipo === 'eliminado' && 'bg-red-50',
                  linea.tipo === 'agregado' && 'bg-emerald-50',
                )}
              >
                {linea.tipo === 'eliminado' ? (
                  <del className="text-red-700 decoration-red-500">
                    {linea.texto}
                  </del>
                ) : linea.tipo === 'agregado' ? (
                  <ins className="bg-emerald-100 text-emerald-900 no-underline">
                    {linea.texto}
                  </ins>
                ) : (
                  <span>{linea.texto}</span>
                )}
              </p>
              {hunk && comentariosDelHunk(hunk)}
            </Fragment>
          )
        })}
      </div>

      {mediaCambios.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2 border-t pt-3">
          {mediaCambios.map((media) => (
            <span
              key={media.part}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                chipMedia(media.estado),
              )}
              title={media.part}
            >
              {etiquetaMedia(media.estado)}: {media.part.split('/').pop()}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
