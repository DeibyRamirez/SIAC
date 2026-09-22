'use client'

import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { CatalogoCategoriasPlantilla } from '@/components/siac/catalogo-categorias-plantilla'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'

export default function PlantillasCargadorPage() {
  return (
    <PlantillaPaginaApp titulo="Biblioteca de plantillas" rol="Cargador">
      <ContenidoPlantillas />
    </PlantillaPaginaApp>
  )
}

function ContenidoPlantillas() {
  const { datos } = usarAlmacen()

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Recursos institucionales"
        titulo="Biblioteca de plantillas"
        descripcion="Selecciona una categoría para descargar formatos oficiales vigentes."
      />

      <CatalogoCategoriasPlantilla
        plantillas={datos.plantillas}
        rol="Cargador"
        soloVigentes
      />
    </div>
  )
}
