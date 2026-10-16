import {
  EnlaceCta,
  envolverHtml,
  fechaCorta,
  parrafoHtml,
  PlantillaCorreo,
  textoCtaPlano,
  urlFrontend,
} from './comun';

export interface DatosAnexoCorreo {
  titulo: string;
  responsable: string;
  /** Fecha de vencimiento del certificado en ISO. */
  fechaVencimientoIso: string;
  programaId?: string;
  anexoId: string;
}

function enlaceAnexo(datos: DatosAnexoCorreo): EnlaceCta {
  const base = `${urlFrontend()}/administrador/vigencias`;
  return {
    href: datos.programaId ? `${base}?programaId=${datos.programaId}` : base,
    texto: 'Revisar el certificado en SIAC',
  };
}

export function mensajeAnexoVenceManana(datos: DatosAnexoCorreo): string {
  return `El documento "${datos.titulo}" vence mañana (${fechaCorta(datos.fechaVencimientoIso)}). Responsable: ${datos.responsable}.`;
}

/** D-1 (T-007.2/h): aviso de certificado que vence mañana. */
export function plantillaAnexoVenceManana(datos: DatosAnexoCorreo): PlantillaCorreo {
  return {
    asunto: '[SIAC] Certificado vence mañana',
    texto: `${mensajeAnexoVenceManana(datos)}${textoCtaPlano(enlaceAnexo(datos))}`,
    html: envolverHtml({
      etiqueta: 'Vigencia',
      titulo: 'Un certificado vence mañana',
      cuerpoHtml: parrafoHtml(mensajeAnexoVenceManana(datos)),
      enlace: enlaceAnexo(datos),
      nota: 'Recordatorio D-1 de vigencia del SIAC. Si el certificado se renueva, cárguelo de nuevo para mantener la vigencia al día.',
    }),
  };
}
