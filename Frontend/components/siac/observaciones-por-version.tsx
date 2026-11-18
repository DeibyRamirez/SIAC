'use client'

import { useEffect, useState } from 'react'

import { EsqueletoFilas } from '@/components/siac/esqueletos'
import { InsigniaEstado } from '@/components/siac/insignia-estado'
import { Badge } from '@/components/ui/badge'
import { etiquetaRol } from '@/lib/auth-mock'
import {
  listarVersionesApi,
  obtenerComentariosEvidenciaApi,
  type ComentarioEvidenciaApi,
  type EvidenciaVersionApi,
  type FilaRevisionRevisorApi,
} from '@/lib/servicios/evidencias.servicio'
import type { EstadoEvidencia } from '@/lib/tipos'
import {
  esDocumentoAprobado,
  formatearFechaHora,
} from '@/lib/utilidades-siac'

interface ComentarioAgrupado extends ComentarioEvidenciaApi {
  esGeneral?: boolean
}

interface GrupoObservaciones {
  version: EvidenciaVersionApi
  comentarios: ComentarioAgrupado[]
}

interface PropsObservacionesPorVersion {
  evidenciaId: string
  fila: FilaRevisionRevisorApi
  estadoActual: EstadoEvidencia
  versionActual: number
}

function resultadoDeVersion(
  version: EvidenciaVersionApi,
  fila: FilaRevisionRevisorApi,
  estadoActual: EstadoEvidencia,
  versionActual: number,
): EstadoEvidencia | null {
  if (version.numero === versionActual) return estadoActual
  if (version.numero === fila.numeroRevision) return fila.estado
  return null
}

/** Línea de tiempo de observaciones guardadas, agrupadas por versión. */
export function ObservacionesPorVersion({
  evidenciaId,
  fila,
  estadoActual,
  versionActual,
}: PropsObservacionesPorVersion) {
  const [grupos, setGrupos] = useState<GrupoObservaciones[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    setCargando(true)
    listarVersionesApi(evidenciaId)
      .then(async (versiones) => {
        const ordenadas = [...versiones].sort((a, b) => a.numero - b.numero)
        const resultados = await Promise.all(
          ordenadas.map(async (version) => ({
            version,
            comentarios: (await obtenerComentariosEvidenciaApi(
              evidenciaId,
              version.numero,
            ).catch(() => [])) as ComentarioAgrupado[],
          })),
        )

        const observacionGeneral = fila.observacionesDictamen?.trim()
        const fechaGeneral = fila.ultimoDictamenFecha ?? fila.fechaEnvioRevision
        const conGeneral = resultados.map((grupo) => {
          if (
            !observacionGeneral ||
            grupo.version.numero !== fila.numeroRevision ||
            grupo.comentarios.some(
              (comentario) => comentario.texto.trim() === observacionGeneral,
            )
          ) {
            return grupo
          }
          return {
            ...grupo,
            comentarios: [
              {
                texto: observacionGeneral,
                autor: 'Revisor',
                createdAt: fechaGeneral,
                esGeneral: true,
              },
              ...grupo.comentarios,
            ],
          }
        })

        const tieneVersionRevisada = conGeneral.some(
          (grupo) => grupo.version.numero === fila.numeroRevision,
        )
        if (observacionGeneral && !tieneVersionRevisada) {
          conGeneral.push({
            version: {
              id: `dictamen-${fila.numeroRevision}`,
              numero: fila.numeroRevision,
              nombreArchivo: '',
              subidoPorId: '',
              createdAt: fechaGeneral,
            },
            comentarios: [
              {
                texto: observacionGeneral,
                autor: 'Revisor',
                createdAt: fechaGeneral,
                esGeneral: true,
              },
            ],
          })
        }

        if (activo) setGrupos(conGeneral)
      })
      .catch((err) => {
        if (activo) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar las observaciones por versión.',
          )
        }
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [evidenciaId, fila])

  if (cargando) {
    return <EsqueletoFilas filas={3} />
  }

  if (error) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </p>
    )
  }

  if (grupos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay observaciones guardadas para esta evidencia.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {grupos.map(({ version, comentarios }) => {
        const resultado = resultadoDeVersion(
          version,
          fila,
          estadoActual,
          versionActual,
        )
        return (
          <section
            key={version.id}
            className="rounded-xl border border-primary/10 bg-white p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-primary">
                Versión {version.numero}
              </h3>
              {resultado ? <InsigniaEstado estado={resultado} /> : null}
              {version.subidoPor?.nombre ? (
                <span className="text-xs text-muted-foreground">
                  {version.subidoPor.nombre}
                  {version.subidoPorRol
                    ? ` · ${etiquetaRol(version.subidoPorRol)}`
                    : ''}
                </span>
              ) : null}
              <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                {formatearFechaHora(version.createdAt)}
              </span>
            </div>

            {comentarios.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
                Sin observaciones en esta versión.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {comentarios.map((comentario, indice) => (
                  <li
                    key={`${version.id}-${indice}`}
                    className="rounded-lg border border-fucsia/20 bg-fucsia/5 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {comentario.esGeneral ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Observación general
                        </Badge>
                      ) : null}
                      <span className="text-xs font-semibold text-primary">
                        {comentario.autor ?? 'Revisor'}
                      </span>
                      <span className="text-xs text-muted-foreground">Revisor</span>
                      {comentario.createdAt ? (
                        <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                          {formatearFechaHora(comentario.createdAt)}
                        </span>
                      ) : null}
                    </div>
                    {comentario.quote ? (
                      <blockquote className="mt-2 border-l-2 border-ocre/60 pl-3 text-sm italic text-muted-foreground">
                        «{comentario.quote}»
                      </blockquote>
                    ) : null}
                    <p className="mt-2 break-words whitespace-pre-line text-sm text-foreground">
                      {comentario.texto}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}

      {esDocumentoAprobado(estadoActual) ? (
        <div className="rounded-xl border border-esmeralda/30 bg-esmeralda/10 px-4 py-3 text-sm font-semibold text-emerald-800">
          Documento aprobado en v{versionActual}
        </div>
      ) : null}
    </div>
  )
}
