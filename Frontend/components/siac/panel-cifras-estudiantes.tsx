'use client'

import { PanelCifrasCategoria } from '@/components/siac/panel-cifras-categoria'

interface PanelCifrasEstudiantesProps {
  periodo?: string
  mensajeEncabezado?: string
}

/**
 * Compatibilidad con el panel específico de estudiantes (HU-009).
 * Todo el comportamiento vive en el panel genérico por categoría.
 */
export function PanelCifrasEstudiantes({
  periodo,
  mensajeEncabezado,
}: PanelCifrasEstudiantesProps) {
  return (
    <PanelCifrasCategoria
      categoriaId="estudiantes"
      categoriaTitulo="Estudiantes"
      periodoInicial={periodo}
      mensajeEncabezado={mensajeEncabezado}
    />
  )
}
