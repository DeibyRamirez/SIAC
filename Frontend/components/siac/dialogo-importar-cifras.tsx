'use client'

import { useRef, useState } from 'react'
import { Download, FileJson, FileSpreadsheet, Loader2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  descargarPlantillaCifrasApi,
  descargarPlantillaJsonCifrasApi,
  importarCifrasExcelApi,
} from '@/lib/servicios/cifras.servicio'
import type { ResultadoImportacionCifras } from '@/lib/tipos/cifras'

export const TAMANO_MAXIMO_XLSX = 20 * 1024 * 1024

interface DialogoImportarCifrasProps {
  categoriaId: string
  categoriaTitulo: string
  abierto: boolean
  onAbiertoCambiar: (abierto: boolean) => void
  onImportado?: () => void
}

export function DialogoImportarCifras({
  categoriaId,
  categoriaTitulo,
  abierto,
  onAbiertoCambiar,
  onImportado,
}: DialogoImportarCifrasProps) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [descargando, setDescargando] = useState(false)
  const [descargandoJson, setDescargandoJson] = useState(false)
  const [importando, setImportando] = useState(false)
  const [errorCliente, setErrorCliente] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoImportacionCifras | null>(null)
  const entradaArchivo = useRef<HTMLInputElement>(null)

  const limpiar = () => {
    setArchivo(null)
    setErrorCliente(null)
    setResultado(null)
    if (entradaArchivo.current) entradaArchivo.current.value = ''
  }

  const cambiarApertura = (siguiente: boolean) => {
    if (!siguiente) limpiar()
    onAbiertoCambiar(siguiente)
  }

  const seleccionarArchivo = (seleccion: File | undefined) => {
    setResultado(null)
    if (!seleccion) {
      setArchivo(null)
      setErrorCliente(null)
      return
    }
    if (!seleccion.name.toLowerCase().endsWith('.xlsx')) {
      setArchivo(null)
      setErrorCliente('Solo se permiten archivos .xlsx.')
      if (entradaArchivo.current) entradaArchivo.current.value = ''
      return
    }
    if (seleccion.size > TAMANO_MAXIMO_XLSX) {
      setArchivo(null)
      setErrorCliente('El archivo supera el tamaño máximo de 20 MB.')
      if (entradaArchivo.current) entradaArchivo.current.value = ''
      return
    }
    setArchivo(seleccion)
    setErrorCliente(null)
  }

  const descargarPlantilla = async () => {
    setDescargando(true)
    setErrorCliente(null)
    try {
      const { blob, nombreArchivo } = await descargarPlantillaCifrasApi(categoriaId)
      const url = URL.createObjectURL(blob)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = nombreArchivo
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setErrorCliente(error instanceof Error ? error.message : 'No fue posible descargar la plantilla.')
    } finally {
      setDescargando(false)
    }
  }

  const descargarEjemploJson = async () => {
    setDescargandoJson(true)
    setErrorCliente(null)
    try {
      const ejemplo = await descargarPlantillaJsonCifrasApi(categoriaId)
      const blob = new Blob([JSON.stringify(ejemplo, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = `ejemplo-cifras-${categoriaId}.json`
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setErrorCliente(error instanceof Error ? error.message : 'No fue posible descargar el ejemplo JSON.')
    } finally {
      setDescargandoJson(false)
    }
  }

  const importar = async () => {
    if (!archivo) return
    setImportando(true)
    setErrorCliente(null)
    try {
      const respuesta = await importarCifrasExcelApi(categoriaId, archivo)
      setResultado(respuesta)
      if (respuesta.filasOk > 0) onImportado?.()
    } catch (error) {
      setErrorCliente(error instanceof Error ? error.message : 'No fue posible importar el archivo.')
    } finally {
      setImportando(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={cambiarApertura}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar cifras — {categoriaTitulo}</DialogTitle>
          <DialogDescription>
            Descargue la plantilla, complete las filas y cargue el archivo .xlsx (máximo 20 MB).
            Las cifras existentes del mismo periodo (o sede) se reemplazan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={descargarPlantilla} disabled={descargando}>
              {descargando ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {descargando ? 'Preparando documento…' : 'Descargar plantilla'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={descargarEjemploJson}
              disabled={descargandoJson}
            >
              {descargandoJson ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileJson className="size-4" />
              )}
              {descargandoJson ? 'Preparando documento…' : 'Descargar ejemplo JSON'}
            </Button>
            <span className="text-xs text-muted-foreground">
              Plantilla con la hoja de la categoría e «instrucciones» (tipo, obligatoriedad,
              valores permitidos y ejemplo).
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={entradaArchivo}
              id="archivo-cifras"
              type="file"
              accept=".xlsx"
              className="sr-only"
              aria-label="Archivo Excel (.xlsx)"
              onChange={(evento) => seleccionarArchivo(evento.target.files?.[0])}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => entradaArchivo.current?.click()}
            >
              <FileSpreadsheet className="size-4" />
              Seleccionar archivo
            </Button>
            <span className="text-sm text-muted-foreground">
              {archivo ? archivo.name : 'Ningún archivo seleccionado'}
            </span>
          </div>

          {errorCliente ? (
            <p role="alert" className="text-sm text-destructive">
              {errorCliente}
            </p>
          ) : null}

          {resultado ? (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-medium text-primary">
                Importación finalizada: {resultado.filasOk} fila(s) importada(s),{' '}
                {resultado.filasError} con error.
              </p>
              {resultado.periodosReemplazados && resultado.periodosReemplazados.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Reemplazados: {resultado.periodosReemplazados.join(', ')}
                </p>
              ) : null}
              {resultado.errores.length > 0 ? (
                <div className="max-h-56 overflow-auto rounded-md border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Fila</TableHead>
                        <TableHead className="w-40">Columna</TableHead>
                        <TableHead>Mensaje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultado.errores.map((error, indice) => (
                        <TableRow key={`${error.fila}-${indice}`}>
                          <TableCell>{error.fila}</TableCell>
                          <TableCell>{error.columna ?? '—'}</TableCell>
                          <TableCell className="text-destructive">{error.mensaje}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => cambiarApertura(false)}>
            Cerrar
          </Button>
          <Button type="button" onClick={importar} disabled={!archivo || importando}>
            {importando ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {importando ? 'Importando…' : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
