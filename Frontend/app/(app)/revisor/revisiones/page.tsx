'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { ControlesPaginacion } from '@/components/siac/controles-paginacion'
import { InsigniaEstado } from '@/components/siac/insignia-estado'
import { EncabezadoPagina, PanelVacio } from '@/components/siac/tarjeta-acceso'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  listarMisRevisionesRevisorApi,
  type FilaRevisionRevisorApi,
} from '@/lib/servicios/evidencias.servicio'
import { LIMITE_FILAS_TABLA } from '@/lib/constantes/paginacion'
import { formatearFechaHora } from '@/lib/utilidades-siac'

export default function MisRevisionesRevisorPage() {
  return (
    <PlantillaPaginaApp titulo="Mis revisiones" rol="Revisor">
      <ContenidoMisRevisiones />
    </PlantillaPaginaApp>
  )
}

function ContenidoMisRevisiones() {
  const [filas, setFilas] = useState<FilaRevisionRevisorApi[]>([])
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      if (!apiDisponible()) {
        setFilas([])
        setTotal(0)
        return
      }
      const resp = await listarMisRevisionesRevisorApi(pagina, LIMITE_FILAS_TABLA)
      setFilas(resp.datos)
      setTotal(resp.total)
    } finally {
      setCargando(false)
    }
  }, [pagina])

  useEffect(() => {
    cargar()
  }, [cargar])

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Flujo de aprobación"
        titulo="Mis revisiones"
        descripcion="Historial de evidencias enviadas a revisión, incluyendo reenvíos tras corrección del cargador."
        accion={
          <Link href="/revisor/bandeja">
            <Button variant="outline">Ir a bandeja</Button>
          </Link>
        }
      />

      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando historial…</p>
      ) : filas.length === 0 ? (
        <PanelVacio mensaje="Aún no hay envíos a revisión registrados." />
      ) : (
        <>
          <div className="space-y-3">
            {filas.map((fila) => (
              <Card key={`${fila.evidenciaId}-${fila.fechaEnvioRevision}`}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-primary">{fila.nombre}</p>
                      <Badge
                        variant={fila.tipoEnvio === 'correccion' ? 'destructive' : 'secondary'}
                      >
                        {fila.tipoEnvio === 'correccion'
                          ? 'Reenvío por corrección'
                          : 'Primera revisión'}
                      </Badge>
                      <InsigniaEstado estado={fila.estado} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {fila.programa?.nombre ?? 'Programa'} · Versión {fila.version ?? 1} ·{' '}
                      {formatearFechaHora(fila.fechaEnvioRevision)}
                    </p>
                    {fila.ultimoDictamenEstado && fila.ultimoDictamenFecha && (
                      <p className="text-xs text-muted-foreground">
                        Dictamen previo: {fila.ultimoDictamenEstado} (
                        {formatearFechaHora(fila.ultimoDictamenFecha)})
                      </p>
                    )}
                  </div>
                  <Link
                    href={
                      fila.estado === 'EnRevision'
                        ? `/revisor/bandeja/${fila.evidenciaId}`
                        : `/revisor/bandeja/${fila.evidenciaId}`
                    }
                  >
                    <Button size="sm">
                      {fila.estado === 'EnRevision' ? 'Revisar' : 'Ver detalle'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <ControlesPaginacion
            pagina={pagina}
            total={total}
            limite={LIMITE_FILAS_TABLA}
            onCambiarPagina={setPagina}
          />
        </>
      )}
    </div>
  )
}
