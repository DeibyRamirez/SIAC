'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { crearProgramaApi } from '@/lib/servicios/programas.servicio'
import type { NivelPrograma } from '@/lib/tipos'
import { notificarProgramasActualizados } from '@/lib/utilidades/eventos-programas'
import { manejarCambioSelect } from '@/lib/utilidades-siac'

interface DialogoCrearProgramaProps {
  abierto: boolean
  onCerrar: () => void
  onCreado: (nombre: string) => void
}

export function DialogoCrearPrograma({ abierto, onCerrar, onCreado }: DialogoCrearProgramaProps) {
  const [nombre, setNombre] = useState('')
  const [nivel, setNivel] = useState<NivelPrograma>('Pregrado')
  const [facultad, setFacultad] = useState('')
  const [guardando, setGuardando] = useState(false)

  function cerrarYLimpiar() {
    setNombre('')
    setNivel('Pregrado')
    setFacultad('')
    onCerrar()
  }

  async function guardar() {
    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) {
      toast.error('Indique el nombre del programa.')
      return
    }
    if (!apiDisponible()) {
      toast.error('La creación requiere la API.')
      return
    }
    setGuardando(true)
    try {
      await crearProgramaApi({
        nombre: nombreLimpio,
        nivel,
        facultad: facultad.trim() || undefined,
      })
      notificarProgramasActualizados()
      toast.success('Programa creado. Trámite inicial: registro calificado nuevo (guía G1).')
      onCreado(nombreLimpio)
      cerrarYLimpiar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear el programa.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && cerrarYLimpiar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear programa</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Programa creado en SIAC (no importado del catálogo externo). Trámite inicial:{' '}
          <strong className="text-foreground">registro calificado nuevo</strong> — solo guía{' '}
          <strong className="text-foreground">G1</strong> hasta que cambie el trámite en el detalle
          del programa.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre-programa">Nombre del programa</Label>
            <Input
              id="nombre-programa"
              value={nombre}
              maxLength={200}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Ingeniería de Software"
            />
          </div>
          <div className="space-y-2">
            <Label>Nivel</Label>
            <Select value={nivel} onValueChange={manejarCambioSelect((v) => setNivel(v as NivelPrograma))}>
              <SelectTrigger aria-label="Nivel académico">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pregrado">Pregrado</SelectItem>
                <SelectItem value="Posgrado">Posgrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="facultad-programa">Facultad (opcional)</Label>
            <Input
              id="facultad-programa"
              value={facultad}
              maxLength={200}
              onChange={(e) => setFacultad(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={cerrarYLimpiar}>
            Cancelar
          </Button>
          <Button type="button" disabled={guardando} onClick={() => void guardar()}>
            {guardando ? 'Creando…' : 'Crear programa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
