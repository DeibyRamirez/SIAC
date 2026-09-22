'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'

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
import { informesPowerBiSemilla, type InformePowerBi } from '@/lib/informes-powerbi'
import { programasSemilla } from '@/lib/datos-semilla'
import { manejarCambioSelect } from '@/lib/utilidades-siac'

export function RejillaInformesPowerBi() {
  const [informeActivo, setInformeActivo] = useState<InformePowerBi | null>(null)
  const [programaId, setProgramaId] = useState(programasSemilla[0]?.id ?? '')
  const [tokenValido, setTokenValido] = useState(true)

  const programa = programasSemilla.find((p) => p.id === programaId)

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
          <span className="text-sm text-muted-foreground">
            {informeActivo.titulo}
          </span>
        </div>

        <Card className="tarjeta-institucional">
          <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-end">
            <label className="block flex-1 space-y-2 text-sm">
              <span className="font-medium">Programa</span>
              <Select value={programaId} onValueChange={manejarCambioSelect(setProgramaId)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {programasSemilla.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
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

        {tokenValido ? (
          <div className="tarjeta-visual overflow-hidden bg-white">
            <div className="border-b px-4 py-3 text-sm text-muted-foreground">
              Informe embebido · {programa?.nombre} · {informeActivo.titulo}
            </div>
            <div className="flex min-h-[420px] items-center justify-center bg-muted p-8 text-center">
              <div>
                <p className="text-lg font-bold text-primary">Power BI embebido</p>
                <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                  Placeholder del informe «{informeActivo.titulo}». Aquí se renderizará el iframe
                  con el embed token cuando la integración con Azure esté disponible.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Card className="tarjeta-institucional">
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm text-destructive">
                No fue posible cargar el informe de Power BI. El token embebido expiró.
              </p>
              <Button onClick={() => setTokenValido(true)}>Reintentar carga</Button>
            </CardContent>
          </Card>
        )}
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
        {informesPowerBiSemilla.map((informe) => (
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
