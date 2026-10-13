import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { DiccionarioVariablesCifras } from '@/components/siac/diccionario-variables-cifras'
import { TablaCategoriasCifras } from '@/components/siac/tabla-categorias-cifras'
import { EncabezadoPagina } from '@/components/siac/tarjeta-acceso'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function CifrasAdministradorPage() {
  return (
    <PlantillaPaginaApp titulo="Cifras institucionales" roles={['Administrador']}>
      <div className="space-y-6">
        <EncabezadoPagina
          className="mb-0"
          etiqueta="Inteligencia institucional"
          titulo="Cifras institucionales"
          descripcion="Administra las cifras de las ocho categorías del SIAC en cifras: descarga la plantilla, importa el Excel y ajusta el diccionario de variables con las etiquetas propias de la CUAC."
        />

        <Tabs defaultValue="categorias" orientation="horizontal" className="flex w-full flex-col gap-4">
          <TabsList
            variant="line"
            className="h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0"
          >
            <TabsTrigger
              value="categorias"
              className="h-auto flex-none px-3 py-2 after:bg-esmeralda data-active:text-primary"
            >
              Categorías
            </TabsTrigger>
            <TabsTrigger
              value="diccionario"
              className="h-auto flex-none px-3 py-2 after:bg-esmeralda data-active:text-primary"
            >
              Diccionario de variables
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categorias">
            <TablaCategoriasCifras />
          </TabsContent>
          <TabsContent value="diccionario">
            <DiccionarioVariablesCifras />
          </TabsContent>
        </Tabs>
      </div>
    </PlantillaPaginaApp>
  )
}
