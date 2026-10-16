'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, HelpCircle, Search, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  CATEGORIAS_FAQ,
  buscarFaq,
  etiquetaCategoriaFaq,
  type CategoriaFaq,
  type EntradaFaq,
} from '@/lib/ayuda/catalogo-faq'
import { cn } from '@/lib/utils'

function ChipCategoria({
  activo,
  children,
  onClick,
}: {
  activo: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-9 items-center rounded-full border px-3 py-2 text-xs font-medium transition-colors',
        activo
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/50',
      )}
    >
      {children}
    </button>
  )
}

function ItemFaqAcordeon({
  entrada,
  expandido,
  onAlternar,
}: {
  entrada: EntradaFaq
  expandido: boolean
  onAlternar: () => void
}) {
  const panelId = `faq-panel-${entrada.id}`
  const triggerId = `faq-trigger-${entrada.id}`

  return (
    <article className="tarjeta-institucional overflow-hidden rounded-xl border border-border/80 bg-card">
      <button
        type="button"
        id={triggerId}
        aria-expanded={expandido}
        aria-controls={panelId}
        onClick={onAlternar}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/30"
      >
        <span className="min-w-0 flex-1 space-y-2">
          <Badge variant="esmeralda" className="h-auto px-2 py-0.5 text-[10px] font-semibold">
            {etiquetaCategoriaFaq(entrada.categoria)}
          </Badge>
          <span className="block text-sm font-semibold text-primary">{entrada.pregunta}</span>
        </span>
        <ChevronDown
          className={cn(
            'mt-1 size-5 shrink-0 text-muted-foreground transition-transform duration-200',
            expandido && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {expandido ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className="border-t border-border/60 px-4 pb-4 pt-3"
        >
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            {entrada.respuesta}
          </p>
          {entrada.enlaces?.map((enlace) => {
            const esInterno = enlace.href.startsWith('/')
            if (esInterno) {
              return (
                <Link
                  key={enlace.href}
                  href={enlace.href}
                  className="mt-3 inline-block text-xs font-medium text-ring hover:underline"
                >
                  {enlace.etiqueta}
                </Link>
              )
            }
            return (
              <a
                key={enlace.href}
                href={enlace.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-xs font-medium text-ring hover:underline"
              >
                {enlace.etiqueta}
              </a>
            )
          })}
        </div>
      ) : null}
    </article>
  )
}

export function AsistenteAyudaFlotante() {
  const [abierto, setAbierto] = useState(false)
  const [consulta, setConsulta] = useState('')
  const [categoria, setCategoria] = useState<CategoriaFaq | 'todas'>('todas')
  const [entradaExpandidaId, setEntradaExpandidaId] = useState<string | null>(null)
  const inputBusquedaRef = useRef<HTMLInputElement>(null)

  const resultados = useMemo(
    () => buscarFaq(consulta, categoria === 'todas' ? undefined : categoria),
    [consulta, categoria],
  )

  useEffect(() => {
    if (!abierto) return
    const id = requestAnimationFrame(() => {
      inputBusquedaRef.current?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [abierto])

  useEffect(() => {
    if (entradaExpandidaId && !resultados.some((r) => r.id === entradaExpandidaId)) {
      setEntradaExpandidaId(null)
    }
  }, [resultados, entradaExpandidaId])

  const mensajeContador =
    resultados.length === 0
      ? 'Sin resultados para su búsqueda.'
      : `Mostrando ${resultados.length} ${resultados.length === 1 ? 'pregunta' : 'preguntas'}.`

  return (
    <>
      <Button
        type="button"
        size={undefined}
        aria-label="Abrir asistente de ayuda"
        aria-expanded={abierto}
        className={cn(
          'fixed z-40 gap-2 rounded-full bg-esmeralda text-white shadow-lg ring-esmeralda/30 hover:bg-esmeralda/90 focus-visible:ring-2 focus-visible:ring-offset-2',
          'bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 md:right-8',
          'size-12 p-0 sm:h-11 sm:w-auto sm:px-4',
          abierto && 'pointer-events-none opacity-0',
        )}
        onClick={() => setAbierto(true)}
      >
        <HelpCircle className="size-5 shrink-0 sm:size-4" aria-hidden />
        <span className="hidden font-semibold sm:inline">Ayuda</span>
      </Button>

      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetContent
          side="right"
          className="flex h-dvh max-h-dvh w-full flex-col gap-0 p-0 sm:max-w-lg"
        >
          <div className="shrink-0 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-cyan-tecnico/5 pr-12">
            <SheetHeader className="borde-institucional border-l-0 px-5 pb-4 pt-5">
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-primary">
                Centro de ayuda
              </p>
              <SheetTitle className="mt-2 text-xl font-extrabold tracking-tight text-primary">
                Asistente SIAC
              </SheetTitle>
              <SheetDescription className="text-pretty text-sm leading-relaxed">
                Preguntas frecuentes sobre trámites, vigencias y documentación. No es un chat en
                vivo: expanda cada tema para leer la respuesta.
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="shrink-0 space-y-3 border-b border-border/60 px-5 py-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                ref={inputBusquedaRef}
                className="pr-9 pl-9"
                placeholder="Buscar en ayuda…"
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                aria-describedby="ayuda-contador-resultados"
              />
              {consulta.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  aria-label="Limpiar búsqueda"
                  onClick={() => setConsulta('')}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <ChipCategoria activo={categoria === 'todas'} onClick={() => setCategoria('todas')}>
                Todas
              </ChipCategoria>
              {CATEGORIAS_FAQ.map((cat) => (
                <ChipCategoria
                  key={cat.id}
                  activo={categoria === cat.id}
                  onClick={() => setCategoria(cat.id)}
                >
                  {cat.etiqueta}
                </ChipCategoria>
              ))}
            </div>
            <p
              id="ayuda-contador-resultados"
              className="text-xs text-muted-foreground"
              aria-live="polite"
            >
              {mensajeContador}
            </p>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-3 px-5 py-4">
              {resultados.length === 0 ? (
                <div
                  className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center"
                  role="status"
                >
                  <Search className="size-10 text-muted-foreground/60" aria-hidden />
                  <p className="text-sm font-medium text-primary">No encontramos coincidencias</p>
                  <p className="max-w-xs text-pretty text-xs text-muted-foreground">
                    Pruebe palabras como «G1», «vigencia», «plantillas» o cambie la categoría.
                  </p>
                </div>
              ) : (
                resultados.map((entrada) => (
                  <ItemFaqAcordeon
                    key={entrada.id}
                    entrada={entrada}
                    expandido={entradaExpandidaId === entrada.id}
                    onAlternar={() =>
                      setEntradaExpandidaId((actual) =>
                        actual === entrada.id ? null : entrada.id,
                      )
                    }
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}
