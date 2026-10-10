'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'

import { ContenedorInformePowerBi } from '@/components/siac/contenedor-informe-powerbi'
import { TarjetaInformePowerBi } from '@/components/siac/tarjeta-informe-powerbi'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usarAlmacen } from '@/components/auth/proveedor-almacen'
import { categoriasInformesPowerBi, type InformePowerBi } from '@/lib/informes-powerbi'
import { itemsSelectProgramas, manejarCambioSelect } from '@/lib/utilidades-siac'

export function RejillaInformesPowerBi() {
  const { datos } = usarAlmacen()
  const programas = datos.programas
  const [informeActivo, setInformeActivo] = useState<InformePowerBi | null>(null)
  const [programaSeleccionadoId, setProgramaId] = useState<string | null>(null)
  const [tokenValido, setTokenValido] = useState(true)

  const programaId = programaSeleccionadoId ?? programas[0]?.id ?? ''
  const programa = programas.find((p) => p.id === programaId)
  const esEstudiantes = informeActivo?.id === 'estudiantes'
  const opcionesPrograma = useMemo(
    () => itemsSelectProgramas(programas),
    [programas],
  )

  if (informeActivo) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            className="w-fit text-primary"
            onClick={() => setInformeActivo(null)}
          >
            <ArrowLeft className="size-4" />
            Volver a informes
          </Button>
          <span className="text-sm text-muted-foreground">{informeActivo.titulo}</span>
        </div>

        {esEstudiantes ? (
          <Card className="tarjeta-institucional">
            <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-end">
              <label className="block flex-1 space-y-2 text-sm">
                <span className="font-medium">Programa</span>
                <Select
                  value={programaId}
                  items={opcionesPrograma}
                  onValueChange={manejarCambioSelect(setProgramaId)}
                  disabled={programas.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No hay programas registrados" />
                  </SelectTrigger>
                  <SelectContent>
                    {opcionesPrograma.map((opcion) => (
                      <SelectItem key={opcion.value} value={opcion.value}>
                        {opcion.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <Button variant="outline" onClick={() => setTokenValido((prev) => !prev)}>
                Simular token {tokenValido ? 'expirado' : 'válido'}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <ContenedorInformePowerBi
          informe={informeActivo}
          nombrePrograma={programa?.nombre}
          tokenValido={tokenValido}
          onRestablecerToken={() => setTokenValido(true)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold text-primary">SIAC en cifras</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Selecciona un informe para consultar las métricas institucionales de acreditación y
          calidad académica.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {categoriasInformesPowerBi.map((informe) => (
          <TarjetaInformePowerBi
            key={informe.id}
            informe={informe}
            onSeleccionar={setInformeActivo}
          />
        ))}
      </div>
    </div>
  )
}
