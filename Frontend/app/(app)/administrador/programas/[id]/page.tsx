'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { Semaforo } from '@/components/siac/insignia-estado'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { TarjetaKpi } from '@/components/siac/tarjeta-kpi'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ROLES_CONSULTA_INSTITUCIONAL } from '@/lib/auth-mock'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { obtenerProgramaApi } from '@/lib/servicios/programas.servicio'
import type { Programa } from '@/lib/tipos'

export default function DetalleProgramaPage() {
  return (
    <PlantillaPaginaApp titulo="Resumen del programa" roles={ROLES_CONSULTA_INSTITUCIONAL}>
      <ContenidoDetallePrograma />
    </PlantillaPaginaApp>
  )
}

function ContenidoDetallePrograma() {
  const params = useParams<{ id: string }>()
  const [programa, setPrograma] = useState<
    (Programa & { evidencias?: { estado: string }[]; anexos?: { estado: string }[] }) | null
  >(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      if (!apiDisponible()) {
        setCargando(false)
        return
      }
      try {
        const data = await obtenerProgramaApi(params.id)
        setPrograma(data as Programa & { evidencias?: { estado: string }[]; anexos?: { estado: string }[] })
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [params.id])

  const conteos = useMemo(() => {
    const evidencias = programa?.evidencias ?? []
    return {
      validadas: evidencias.filter((e) => e.estado === 'Validado').length,
      enRevision: evidencias.filter((e) => e.estado === 'EnRevision').length,
      rechazadas: evidencias.filter((e) => e.estado === 'Rechazado').length,
      anexosProximos: (programa?.anexos ?? []).filter((a) => a.estado === 'Proximo').length,
    }
  }, [programa])

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando programa…</p>
  }

  if (!programa) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">Programa no encontrado.</p>
        <Link href="/administrador/programas">
          <Button variant="outline">Volver</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Acreditación por carrera"
        titulo={programa.nombre}
        descripcion={`${programa.codigo} · ${programa.nivel} · Proceso ${programa.estadoProceso}`}
        accion={
          <Link href="/administrador/programas">
            <Button variant="outline">Volver al catálogo</Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Avance de acreditación</span>
            <span className="font-semibold text-esmeralda">{programa.porcentajeAvance}%</span>
          </div>
          <Progress value={programa.porcentajeAvance} className="h-3" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Semáforo institucional (RN-003)</span>
            <Semaforo valor={programa.semaforo} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <TarjetaKpi titulo="Evidencias validadas" valor={String(conteos.validadas)} />
        <TarjetaKpi titulo="En revisión" valor={String(conteos.enRevision)} />
        <TarjetaKpi titulo="En corrección" valor={String(conteos.rechazadas)} />
        <TarjetaKpi titulo="Docs por vencer" valor={String(conteos.anexosProximos)} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href={`/administrador/evidencias?programaId=${programa.id}`}>
          <Button>Ver evidencias de este programa</Button>
        </Link>
        <Link href="/administrador/plantillas">
          <Button variant="outline">Plantillas compartidas</Button>
        </Link>
        <Link href={`/administrador/vigencias?programaId=${programa.id}`}>
          <Button variant="outline">Vigencias del programa</Button>
        </Link>
      </div>
    </div>
  )
}
