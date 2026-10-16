import {
  EnlaceCta,
  envolverHtml,
  parrafoHtml,
  PlantillaCorreo,
  textoCtaPlano,
  urlFrontend,
} from './comun';

export interface DatosAvanceCorreo {
  nombrePrograma: string;
  avance: number;
  umbral: 'amarillo' | 'verde';
  minimo: number;
  programaId: string;
}

function enlacePrograma(datos: DatosAvanceCorreo): EnlaceCta {
  return {
    href: `${urlFrontend()}/administrador/programas/${datos.programaId}`,
    texto: 'Ver programa',
  };
}

export function mensajeAvanceUmbral(datos: DatosAvanceCorreo): string {
  return `El programa "${datos.nombrePrograma}" alcanzó ${datos.avance.toFixed(1)}% de avance (umbral ${datos.umbral}: ${datos.minimo}%).`;
}

/** HU-010/HU-007: el programa cruza un umbral de avance. */
export function plantillaAvanceUmbral(datos: DatosAvanceCorreo): PlantillaCorreo {
  const mensaje = mensajeAvanceUmbral(datos);
  return {
    asunto: '[SIAC] Avance de programa',
    texto: `${mensaje}${textoCtaPlano(enlacePrograma(datos))}`,
    html: envolverHtml({
      etiqueta: 'Avance de programa',
      titulo: 'Cambio de umbral de avance',
      cuerpoHtml: parrafoHtml(mensaje),
      enlace: enlacePrograma(datos),
    }),
  };
}
