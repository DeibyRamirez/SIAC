'use client'

import Image from 'next/image'
import Link from 'next/link'

import type { MetaCategoriaPlantilla } from '@/lib/categorias-plantilla'

interface TarjetaCategoriaPlantillaProps {
  meta: MetaCategoriaPlantilla
  conteo: number
  href: string
}

export function TarjetaCategoriaPlantilla({ meta, conteo, href }: TarjetaCategoriaPlantillaProps) {
  return (
    <Link href={href} className="tarjeta-visual group block">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={meta.imagenUrl}
          alt={meta.titulo}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-end p-5">
          <span className="rounded-full bg-white/25 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
            {conteo} {conteo === 1 ? 'documento' : 'documentos'}
          </span>
        </div>
      </div>
      <div className="px-5 py-4">
        <h3 className="text-base font-bold text-primary">{meta.titulo}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{meta.descripcion}</p>
      </div>
    </Link>
  )
}
