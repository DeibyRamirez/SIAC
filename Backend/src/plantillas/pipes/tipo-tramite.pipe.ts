import { BadRequestException, ParseEnumPipe } from '@nestjs/common';
import { TipoTramitePlantilla } from '@prisma/client';

/** Valores admitidos en el filtro `tipoTramite`, en el orden del enum de Prisma. */
export const TIPOS_TRAMITE_PLANTILLA = Object.values(TipoTramitePlantilla);

/**
 * Valida el filtro opcional `?tipoTramite=` contra el enum `TipoTramitePlantilla`.
 * Sin esta validación un valor desconocido llegaba a Prisma y respondía 500 (D-1 de la
 * auditoría del 20/10/2026); ahora responde 400 con un mensaje en español. Si el
 * parámetro no viene, el listado no se filtra.
 */
export function crearPipeTipoTramite(): ParseEnumPipe {
  return new ParseEnumPipe(TipoTramitePlantilla, {
    optional: true,
    exceptionFactory: () =>
      new BadRequestException(
        `tipoTramite no es válido. Valores permitidos: ${TIPOS_TRAMITE_PLANTILLA.join(', ')}.`,
      ),
  });
}
