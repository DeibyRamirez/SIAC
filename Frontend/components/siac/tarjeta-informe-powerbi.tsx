'use client'

import Image from 'next/image'

import type { InformePowerBi } from '@/lib/informes-powerbi'

interface TarjetaInformePowerBiProps {
  informe: InformePowerBi
  onSeleccionar: (informe: InformePowerBi) => void
}

export function TarjetaInformePowerBi({ informe, onSeleccionar }: TarjetaInformePowerBiProps) {
  return (
    <button
      type="button"
      onClick={() => onSeleccionar(informe)}
      className="tarjeta-visual group w-full cursor-pointer overflow-hidden text-left"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {informe.urlImagen ? (
          <Image
            src={informe.urlImagen}
            alt={informe.titulo}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${informe.gradienteDesde} 0%, ${informe.gradienteHasta} 100%)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-primary">
          {informe.valor} / 5
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-end p-4">
          <div className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase backdrop-blur-sm">
            Categoría SIAC
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        <h3 className="text-base font-bold text-primary">{informe.titulo}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{informe.descripcion}</p>
      </div>
    </button>
  )
}
