'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { GuardiaSesion } from '@/components/auth/guardia-sesion'
import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { ShellAplicacion } from '@/components/layout/shell-aplicacion'
import { InsigniaEstado } from '@/components/siac/insignia-estado'
import { EncabezadoPagina, PanelVacio } from '@/components/siac/tarjeta-acceso'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatearFecha, obtenerNombrePrograma } from '@/lib/utilidades-siac'

export default function MisEvidenciasPage() {
  return (
    <GuardiaSesion rolPermitido="Cargador">
      <ContenidoMisEvidencias />
    </GuardiaSesion>
  )
}

function ContenidoMisEvidencias() {
  const { sesion } = usarSesion()
  const { datos, actualizarEvidencia, eliminarEvidencia } = usarAlmacen()
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nombreEditado, setNombreEditado] = useState('')

  const misEvidencias = useMemo(
    () => datos.evidencias.filter((evidencia) => evidencia.autorId === sesion?.usuarioId),
    [datos.evidencias, sesion?.usuarioId],
  )

  function iniciarEdicion(id: string, nombre: string) {
    setEditandoId(id)
    setNombreEditado(nombre)
  }

  function guardarEdicion(id: string) {
    actualizarEvidencia(id, { nombre: nombreEditado.trim() })
    setEditandoId(null)
  }

  return (
    <ShellAplicacion titulo="Mis evidencias">
      <EncabezadoPagina
        etiqueta="HU-004"
        titulo="Mis evidencias"
        descripcion="Listado de tus documentos. Solo puedes editar o eliminar borradores propios."
        accion={
          <Link href="/cargador/evidencias/nueva">
            <Button>Cargar evidencia</Button>
          </Link>
        }
      />

      {misEvidencias.length === 0 ? (
        <PanelVacio mensaje="Aún no has registrado evidencias." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-6">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4">Documento</th>
                  <th className="py-3 pr-4">Programa</th>
                  <th className="py-3 pr-4">Factor</th>
                  <th className="py-3 pr-4">Periodo</th>
                  <th className="py-3 pr-4">Estado</th>
                  <th className="py-3 pr-4">Fecha</th>
                  <th className="py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {misEvidencias.map((evidencia) => (
                  <tr key={evidencia.id} className="border-b border-border/70">
                    <td className="py-3 pr-4">
                      {editandoId === evidencia.id ? (
                        <input
                          value={nombreEditado}
                          onChange={(evento) => setNombreEditado(evento.target.value)}
                          className="w-full rounded-md border border-input px-2 py-1"
                        />
                      ) : (
                        <div>
                          <p className="font-medium text-[#102f55]">{evidencia.nombre}</p>
                          <p className="text-xs text-muted-foreground">{evidencia.nombreArchivo}</p>
                          {evidencia.observaciones && (
                            <p className="mt-1 text-xs text-red-700">{evidencia.observaciones}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4">{obtenerNombrePrograma(evidencia.programaId)}</td>
                    <td className="py-3 pr-4">{evidencia.factor}</td>
                    <td className="py-3 pr-4">{evidencia.periodo}</td>
                    <td className="py-3 pr-4">
                      <InsigniaEstado estado={evidencia.estado} />
                    </td>
                    <td className="py-3 pr-4">{formatearFecha(evidencia.fechaCarga)}</td>
                    <td className="py-3">
                      {evidencia.estado === 'Borrador' ? (
                        <div className="flex gap-2">
                          {editandoId === evidencia.id ? (
                            <Button size="sm" onClick={() => guardarEdicion(evidencia.id)}>
                              Guardar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => iniciarEdicion(evidencia.id, evidencia.nombre)}
                            >
                              Editar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => eliminarEvidencia(evidencia.id)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No editable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </ShellAplicacion>
  )
}
