import { CodigoDocumentoGuia } from '@prisma/client';

/**
 * Guías que el Revisor no puntúa por condiciones (decisión del PO, 06/10): G2 y G4 solo se
 * aprueban o se dejan «Con observaciones». Aportan 0 % hasta aprobarse y el 100 % de su peso después.
 */
export const GUIAS_SIN_PUNTAJE: readonly CodigoDocumentoGuia[] = [CodigoDocumentoGuia.G2, CodigoDocumentoGuia.G4];

export function esGuiaSinPuntaje(codigoGuia: CodigoDocumentoGuia | null | undefined): boolean {
  return !!codigoGuia && GUIAS_SIN_PUNTAJE.includes(codigoGuia);
}
