'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { ControlesPaginacion } from '@/components/siac/controles-paginacion'
import { DialogoConfirmacion } from '@/components/siac/dialogo-confirmacion'
import { FiltroPrograma } from '@/components/siac/filtro-programa'
import { TablaEvidencias } from '@/components/siac/tabla-evidencias'
import { EncabezadoPagina, PanelVacio } from '@/components/siac/tarjeta-acceso'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { listarEvidenciasApi } from '@/lib/servicios/evidencias.servicio'
import type { Evidencia } from '@/lib/tipos'
import { contarNovedadesCargador } from '@/lib/utilidades-siac'

const LIMITE_POR_PAGINA = 10

export default function MisEvidenciasPage() {
  return (
    <PlantillaPaginaApp titulo="Mis evidencias" rol="Cargador">
      <ContenidoMisEvidencias />
    </PlantillaPaginaApp>
  )
}

function ContenidoMisEvidencias() {
  const { sesion } = usarSesion()
  const { datos, actualizarEvidencia, eliminarEvidencia } = usarAlmacen()
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nombreEditado, setNombreEditado] = useState('')
  const [idEliminar, setIdEliminar] = useState<string | null>(null)
  const [programaId, setProgramaId] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [evidencias, setEvidencias] = useState<Evidencia[]>([])
  const [cargando, setCargando] = useState(true)

  const novedades = useMemo(
    () => (sesion ? contarNovedadesCargador(datos.evidencias, sesion.usuarioId) : 0),
    [datos.evidencias, sesion],
  )

  const cargarEvidencias = useCallback(async () => {
    setCargando(true)
    try {
      if (apiDisponible()) {
        const resp = await listarEvidenciasApi({
          pagina,
          limite: LIMITE_POR_PAGINA,
          programaId: programaId === 'todos' ? undefined : programaId,
        })
        setEvidencias(
          resp.datos.map((e) => ({
            ...e,
            fechaCarga:
              typeof e.fechaCarga === 'string'
                ? e.fechaCarga.slice(0, 10)
                : new Date().toISOString().slice(0, 10),
          })),
        )
        setTotal(resp.total)
        return
      }

      let lista = datos.evidencias.filter((evidencia) => evidencia.autorId === sesion?.usuarioId)
      if (programaId !== 'todos') {
        lista = lista.filter((evidencia) => evidencia.programaId === programaId)
      }
      setTotal(lista.length)
      const inicio = (pagina - 1) * LIMITE_POR_PAGINA
      setEvidencias(lista.slice(inicio, inicio + LIMITE_POR_PAGINA))
    } finally {
      setCargando(false)
    }
  }, [pagina, programaId, datos.evidencias, sesion?.usuarioId])

  useEffect(() => {
    cargarEvidencias()
  }, [cargarEvidencias])

  useEffect(() => {
    setPagina(1)
  }, [programaId])

  function guardarEdicion(id: string) {
    actualizarEvidencia(id, { nombre: nombreEditado.trim() })
    setEditandoId(null)
    toast.success('Evidencia actualizada.')
    cargarEvidencias()
  }

  function confirmarEliminacion() {
    if (!idEliminar) return
    const ev = evidencias.find((e) => e.id === idEliminar)
    if (ev?.estado === 'Borrador') {
      eliminarEvidencia(idEliminar)
      toast.success('Evidencia eliminada.')
      cargarEvidencias()
    } else {
      toast.error('Solo se pueden eliminar borradores.')
    }
    setIdEliminar(null)
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Gestión documental"
        titulo="Mis evidencias"
        descripcion="Listado paginado de tus documentos. Solo puedes editar o eliminar borradores propios."
        accion={
          <div className="flex items-center gap-2">
            {novedades > 0 && (
              <Badge variant="destructive">{novedades} novedades</Badge>
            )}
            <Link href="/cargador/evidencias/nueva">
              <Button>Cargar evidencia</Button>
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <FiltroPrograma valor={programaId} onCambiar={setProgramaId} />
      </div>

      {editandoId && (
        <div className="flex gap-2 rounded-xl border border-primary/15 bg-white p-4 shadow-sm">
          <Input
            value={nombreEditado}
            onChange={(e) => setNombreEditado(e.target.value)}
            className="max-w-md"
          />
          <Button onClick={() => guardarEdicion(editandoId)}>Guardar</Button>
          <Button variant="outline" onClick={() => setEditandoId(null)}>
            Cancelar
          </Button>
        </div>
      )}

      <ControlesPaginacion
        pagina={pagina}
        limite={LIMITE_POR_PAGINA}
        total={total}
        onCambiarPagina={setPagina}
      />

      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando evidencias…</p>
      ) : evidencias.length === 0 ? (
        <PanelVacio mensaje="Aún no has registrado evidencias." />
      ) : (
        <TablaEvidencias
          evidencias={evidencias}
          enlaceDetalle={(id) => `/cargador/evidencias/${id}`}
          mostrarNovedades
          onEliminar={(id) => setIdEliminar(id)}
        />
      )}

      <DialogoConfirmacion
        abierto={Boolean(idEliminar)}
        titulo="¿Eliminar evidencia?"
        descripcion="Esta acción no se puede deshacer. Solo aplica a borradores."
        etiquetaConfirmar="Sí, eliminar"
        variant="destructive"
        onConfirmar={confirmarEliminacion}
        onCancelar={() => setIdEliminar(null)}
      />
    </div>
  )
}
