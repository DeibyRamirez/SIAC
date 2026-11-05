import { columnasPersistidas, EsquemaCategoriaCifras } from './esquemas/tipos';

function valorLectura(valor: unknown, tipo: string): unknown {
  if (valor instanceof Date) {
    return tipo === 'fecha' ? valor.toISOString().slice(0, 10) : valor.toISOString();
  }
  if (valor && typeof valor === 'object' && 'toNumber' in valor && typeof valor.toNumber === 'function') {
    return (valor as { toNumber: () => number }).toNumber();
  }
  return valor ?? null;
}

/**
 * Proyección de lectura. Omite las columnas personales (nombre y código o documento de persona).
 * Conserva el id, el integrador y la fecha de envío, que no identifican a una persona.
 */
export function proyectarLecturaCifra(
  esquema: EsquemaCategoriaCifras,
  fila: Record<string, unknown>,
): Record<string, unknown> {
  const salida: Record<string, unknown> = {
    id: fila.id,
    integradorId: fila.integradorId,
    enviadoEn: valorLectura(fila.enviadoEn, 'fecha-hora'),
  };
  for (const columna of columnasPersistidas(esquema)) {
    if (columna.personal) continue;
    salida[columna.clave] = valorLectura(fila[columna.campoPrisma], columna.tipo);
  }
  return salida;
}

export function columnasExcluidasLectura(esquema: EsquemaCategoriaCifras): string[] {
  return esquema.columnas.filter((columna) => columna.personal).map((columna) => columna.clave);
}
