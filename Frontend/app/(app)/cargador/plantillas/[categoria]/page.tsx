'use client'

import Link from 'next/link'
import { use, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { RejillaPlantillas } from '@/components/siac/rejilla-plantillas'
import { Input } from '@/components/ui/input'
import { categoriaDesdeSlug } from '@/lib/categorias-plantilla'

export default function PlantillasCategoriaCargadorPage({
  params,
}: {
  params: Promise<{ categoria: string }>
}) {
  const { categoria: slug } = use(params)
  const meta = categoriaDesdeSlug(slug)

  if (!meta) {
    notFound()
  }

  return (
    <PlantillaPaginaApp titulo="Biblioteca de plantillas" rol="Cargador">
      <ContenidoCategoria meta={meta} />
    </PlantillaPaginaApp>
  )
}

function ContenidoCategoria({
  meta,
}: {
  meta: NonNullable<ReturnType<typeof categoriaDesdeSlug>>
}) {
  const { datos } = usarAlmacen()
  const [busqueda, setBusqueda] = useState('')

  const plantillasFiltradas = useMemo(() => {
    return datos.plantillas.filter((p) => {
      if (p.categoria !== meta.categoria || !p.vigente) return false
      const texto = busqueda.toLowerCase()
      return (
        p.nombre.toLowerCase().includes(texto) ||
        p.factor.toLowerCase().includes(texto)
      )
    })
  }, [datos.plantillas, meta.categoria, busqueda])

  return (
    <div className="space-y-6">
      <div className="borde-institucional space-y-2">
        <Link
          href="/cargador/plantillas"
          className="inline-flex items-center gap-1 text-sm font-medium text-cyan-tecnico hover:underline"
        >
          <ArrowLeft className="size-4" />
          Biblioteca de plantillas
        </Link>
        <p className="text-[11px] font-bold tracking-[0.14em] text-esmeralda uppercase">
          {meta.titulo}
        </p>
        <h1 className="text-2xl font-bold text-primary">{meta.titulo}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{meta.descripcion}</p>
      </div>

      <Input
        placeholder="Buscar en esta categoría…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="max-w-md"
      />

      <RejillaPlantillas plantillas={plantillasFiltradas} />

      <p className="text-sm text-muted-foreground">
        ¿Necesitas corregir un rechazo?{' '}
        <Link href="/cargador/evidencias" className="font-medium text-esmeralda hover:underline">
          Revisa tus evidencias
        </Link>
        .
      </p>
    </div>
  )
}
