'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, FolderOpen, LayoutDashboard, Search } from 'lucide-react'

import { usarSesion } from '@/components/auth/proveedor-sesion'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { buscarUnificadaApi } from '@/lib/servicios/programas.servicio'
import type { RolUsuario } from '@/lib/tipos'

const rutasBusqueda = [
  { href: '/administrador', etiqueta: 'Resumen general', grupo: 'Administrador' },
  { href: '/administrador/dashboard', etiqueta: 'Dashboard de métricas', grupo: 'Administrador' },
  { href: '/administrador/programas', etiqueta: 'Programas académicos', grupo: 'Administrador' },
  { href: '/administrador/evidencias', etiqueta: 'Evidencias y documentos', grupo: 'Administrador' },
  { href: '/administrador/vigencias', etiqueta: 'Vigencias y alertas', grupo: 'Administrador' },
  { href: '/administrador/plantillas', etiqueta: 'Biblioteca de plantillas', grupo: 'Administrador' },
  { href: '/administrador/bandeja-revision', etiqueta: 'Bandeja de revisión', grupo: 'Administrador' },
  { href: '/cargador', etiqueta: 'Inicio cargador', grupo: 'Cargador' },
  { href: '/cargador/evidencias/nueva', etiqueta: 'Cargar evidencia', grupo: 'Cargador' },
  { href: '/cargador/evidencias', etiqueta: 'Mis evidencias', grupo: 'Cargador' },
  { href: '/revisor/bandeja', etiqueta: 'Bandeja de revisión', grupo: 'Revisor' },
  { href: '/superadmin', etiqueta: 'Panel SuperAdmin', grupo: 'SuperAdmin' },
]

function rutaDetalleEvidencia(rol: RolUsuario, id: string): string {
  switch (rol) {
    case 'Cargador':
      return `/cargador/evidencias/${id}`
    case 'Revisor':
      return `/revisor/bandeja/${id}`
    default:
      return `/administrador/evidencias/${id}`
  }
}

interface BusquedaInlineProps {
  inputRef?: React.RefObject<HTMLInputElement | null>
}

export function BusquedaInline({ inputRef }: BusquedaInlineProps) {
  const router = useRouter()
  const { sesion } = usarSesion()
  const [consulta, setConsulta] = useState('')
  const [abierta, setAbierta] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<{
    evidencias: { id: string; nombre: string; nombreArchivo: string }[]
    plantillas: { id: string; nombre: string; nombreArchivo?: string | null }[]
    documentos: { id: string; titulo: string; nombreArchivo?: string | null; carpeta: string }[]
  }>({ evidencias: [], plantillas: [], documentos: [] })
  const contenedorRef = useRef<HTMLDivElement>(null)

  const rutasFiltradas = useMemo(() => {
    const q = consulta.trim().toLowerCase()
    if (!q) return rutasBusqueda.slice(0, 6)
    return rutasBusqueda.filter(
      (r) => r.etiqueta.toLowerCase().includes(q) || r.grupo.toLowerCase().includes(q),
    )
  }, [consulta])

  useEffect(() => {
    if (!consulta.trim() || consulta.trim().length < 2 || !apiDisponible()) {
      setResultados({ evidencias: [], plantillas: [], documentos: [] })
      return
    }

    const timer = setTimeout(async () => {
      setBuscando(true)
      try {
        const data = await buscarUnificadaApi(consulta.trim())
        setResultados(data)
      } catch {
        setResultados({ evidencias: [], plantillas: [], documentos: [] })
      } finally {
        setBuscando(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [consulta])

  useEffect(() => {
    function cerrarAlClickFuera(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setAbierta(false)
      }
    }
    document.addEventListener('mousedown', cerrarAlClickFuera)
    return () => document.removeEventListener('mousedown', cerrarAlClickFuera)
  }, [])

  function navegar(ruta: string) {
    setAbierta(false)
    setConsulta('')
    router.push(ruta)
  }

  const hayResultados =
    rutasFiltradas.length > 0 ||
    resultados.evidencias.length > 0 ||
    resultados.plantillas.length > 0 ||
    resultados.documentos.length > 0

  return (
    <div ref={contenedorRef} className="relative mx-auto w-full max-w-md">
      <div className="flex h-10 items-center gap-2 rounded-full border border-primary/15 bg-white px-4 shadow-sm transition-all focus-within:border-cyan-tecnico/40 focus-within:shadow-md">
        <Search className="size-4 shrink-0 text-cyan-tecnico" />
        <input
          ref={inputRef}
          type="search"
          value={consulta}
          onChange={(e) => {
            setConsulta(e.target.value)
            setAbierta(true)
          }}
          onFocus={() => setAbierta(true)}
          placeholder="Buscar por nombre de archivo, documento o formato…"
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden rounded-md border border-primary/10 bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-primary sm:inline">
          Ctrl K
        </kbd>
      </div>

      {abierta && hayResultados && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(420px,70vh)] overflow-y-auto rounded-xl border bg-white p-2 shadow-lg">
          {buscando && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Buscando…</p>
          )}

          {rutasFiltradas.length > 0 && (
            <section className="mb-2">
              <p className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                Navegación rápida
              </p>
              {rutasFiltradas.map((ruta) => (
                <button
                  key={ruta.href}
                  type="button"
                  onClick={() => navegar(ruta.href)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <LayoutDashboard className="size-4 shrink-0 text-cyan-tecnico" />
                  <span className="flex-1">{ruta.etiqueta}</span>
                  <span className="text-xs text-muted-foreground">{ruta.grupo}</span>
                </button>
              ))}
            </section>
          )}

          {resultados.evidencias.length > 0 && (
            <section className="mb-2">
              <p className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                Evidencias
              </p>
              {resultados.evidencias.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() =>
                    navegar(rutaDetalleEvidencia(sesion?.rol ?? 'Administrador', doc.id))
                  }
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <FileText className="size-4 shrink-0 text-primary" />
                  <span className="flex-1 truncate">{doc.nombre || doc.nombreArchivo}</span>
                </button>
              ))}
            </section>
          )}

          {resultados.plantillas.length > 0 && (
            <section className="mb-2">
              <p className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                Plantillas
              </p>
              {resultados.plantillas.map((plt) => (
                <button
                  key={plt.id}
                  type="button"
                  onClick={() => navegar('/administrador/plantillas')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <FileText className="size-4 shrink-0 text-esmeralda" />
                  <span className="flex-1 truncate">{plt.nombre}</span>
                </button>
              ))}
            </section>
          )}

          {resultados.documentos.length > 0 && (
            <section>
              <p className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                Documentos institucionales
              </p>
              {resultados.documentos.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => navegar('/administrador/vigencias')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <FolderOpen className="size-4 shrink-0 text-amber-600" />
                  <span className="flex-1 truncate">{doc.titulo}</span>
                  <span className="text-xs text-muted-foreground">{doc.carpeta}</span>
                </button>
              ))}
            </section>
          )}

          <p className="border-t px-3 py-2 text-[10px] text-muted-foreground">
            Ctrl+K para enfocar · Esc para cerrar
          </p>
        </div>
      )}
    </div>
  )
}
