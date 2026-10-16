/**
 * T-007.3f: lista de destinatarios permitidos para desarrollo (`CORREO_DESTINATARIOS_PERMITIDOS`,
 * separada por comas). Trim y minúsculas; lista vacía o ausente = no se permite ningún destinatario.
 * En producción no se aplica esta lista (solo desarrollo/pruebas).
 */
export function normalizarDestinatariosPermitidos(
  lista: string | undefined | null,
): string[] {
  return (lista ?? '')
    .split(',')
    .map((correo) => correo.trim().toLowerCase())
    .filter((correo) => correo.length > 0);
}

export interface ResultadoFiltroDestinatarios {
  permitidos: string[];
  descartados: string[];
}

/**
 * Separa destinatarios permitidos y descartados. Compara siempre en minúsculas y sin espacios.
 */
export function filtrarDestinatariosPermitidos(
  listaPermitidos: string | undefined | null,
  destinatarios: string[],
): ResultadoFiltroDestinatarios {
  const permitidosLista = new Set(normalizarDestinatariosPermitidos(listaPermitidos));
  const permitidos: string[] = [];
  const descartados: string[] = [];
  for (const destinatario of destinatarios) {
    const normalizado = destinatario.trim().toLowerCase();
    if (permitidosLista.has(normalizado)) permitidos.push(normalizado);
    else descartados.push(normalizado);
  }
  return { permitidos, descartados };
}

/** ¿El destinatario está en la lista permitida? (lista vacía = nadie permitido). */
export function destinatarioPermitidoEnDesarrollo(
  listaPermitidos: string | undefined | null,
  destinatario: string,
): boolean {
  return filtrarDestinatariosPermitidos(listaPermitidos, [destinatario]).permitidos.length === 1;
}
