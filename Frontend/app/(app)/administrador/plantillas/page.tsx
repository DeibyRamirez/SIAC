'use client'

import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { CatalogoCategoriasPlantilla } from '@/components/siac/catalogo-categorias-plantilla'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { Button } from '@/components/ui/button'

export default function PlantillasAdministradorPage() {
  return (
    <PlantillaPaginaApp titulo="Biblioteca de plantillas" rol="Administrador">
      <ContenidoPlantillas />
    </PlantillaPaginaApp>
  )
}

function ContenidoPlantillas() {
  const { datos } = usarAlmacen()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <EncabezadoPagina
          etiqueta="Recursos institucionales"
          titulo="Biblioteca de plantillas"
          descripcion="Selecciona una categoría para consultar los formatos oficiales del Decreto 1330 de 2019."
        />
        <Button
          onClick={() =>
            toast.info('Crea la plantilla dentro de la categoría correspondiente.', {
              description: 'Ingresa a una carpeta y usa el botón «Nueva plantilla».',
            })
          }
        >
          <Plus className="size-4" />
          Nueva plantilla
        </Button>
      </div>

      <CatalogoCategoriasPlantilla plantillas={datos.plantillas} rol="Administrador" />
    </div>
  )
}
