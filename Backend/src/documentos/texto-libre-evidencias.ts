import {
  CodigoDocumentoGuia,
  EstadoEvidencia,
  Prisma,
} from '@prisma/client';
import {
  type ColorSemaforoBusqueda,
  filtroSemaforo,
} from './constructor-consulta-evidencias';

const CODIGOS_GUIA = Object.values(CodigoDocumentoGuia) as string[];

const ETIQUETAS_ESTADO: Record<EstadoEvidencia, string> = {
  [EstadoEvidencia.Borrador]: 'Borrador',
  [EstadoEvidencia.EnRevision]: 'Pendiente de verificación',
  [EstadoEvidencia.ConObservaciones]: 'Con observaciones',
  [EstadoEvidencia.Cumple]: 'Cumple',
  [EstadoEvidencia.Validado]: 'Validado',
  [EstadoEvidencia.Rechazado]: 'Rechazado',
};

const ETIQUETAS_NIVEL: Record<ColorSemaforoBusqueda, string> = {
  Verde: 'Cumplimiento total',
  Amarillo: 'En proceso',
  Rojo: 'Requiere atención',
  Gris: 'Sin puntaje',
};

const COLORES_SEMAFORO: ColorSemaforoBusqueda[] = [
  'Verde',
  'Amarillo',
  'Rojo',
  'Gris',
];

function normalizarConsulta(texto: string): string {
  return texto.trim().toLowerCase();
}

function guiasQueCoinciden(texto: string): CodigoDocumentoGuia[] {
  const q = normalizarConsulta(texto);
  if (!q) return [];
  return CODIGOS_GUIA.filter((codigo) =>
    codigo.toLowerCase().includes(q),
  ) as CodigoDocumentoGuia[];
}

function estadosQueCoinciden(texto: string): EstadoEvidencia[] {
  const q = normalizarConsulta(texto);
  if (!q) return [];
  return (Object.values(EstadoEvidencia) as EstadoEvidencia[]).filter(
    (estado) =>
      estado.toLowerCase().includes(q) ||
      ETIQUETAS_ESTADO[estado].toLowerCase().includes(q),
  );
}

function coloresSemaforoQueCoinciden(texto: string): ColorSemaforoBusqueda[] {
  const q = normalizarConsulta(texto);
  if (!q) return [];
  return COLORES_SEMAFORO.filter(
    (color) =>
      color.toLowerCase().includes(q) ||
      ETIQUETAS_NIVEL[color].toLowerCase().includes(q),
  );
}

function condicionPuntajeDesdeTexto(
  texto: string,
): Prisma.EvidenciaWhereInput | undefined {
  const t = texto.trim();
  const fraccion = /^(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (fraccion) {
    const puntaje = parseInt(fraccion[1], 10);
    const total = parseInt(fraccion[2], 10);
    if (!Number.isNaN(puntaje) && !Number.isNaN(total)) {
      return {
        AND: [
          { puntajeActual: puntaje },
          { totalCondicionesActual: total },
        ],
      };
    }
  }

  if (/^\d+$/.test(t)) {
    return { puntajeActual: parseInt(t, 10) };
  }

  return undefined;
}

function condicionFechaCargaDesdeTexto(
  texto: string,
): Prisma.EvidenciaWhereInput | undefined {
  const t = texto.trim();

  if (/^\d{4}$/.test(t)) {
    const año = parseInt(t, 10);
    return {
      fechaCarga: {
        gte: new Date(Date.UTC(año, 0, 1)),
        lte: new Date(Date.UTC(año, 11, 31, 23, 59, 59, 999)),
      },
    };
  }

  const añoMes = /^(\d{4})-(\d{2})$/.exec(t);
  if (añoMes) {
    const año = parseInt(añoMes[1], 10);
    const mes = parseInt(añoMes[2], 10) - 1;
    if (mes >= 0 && mes <= 11) {
      return {
        fechaCarga: {
          gte: new Date(Date.UTC(año, mes, 1)),
          lt: new Date(Date.UTC(año, mes + 1, 1)),
        },
      };
    }
  }

  const isoDia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (isoDia) {
    const año = parseInt(isoDia[1], 10);
    const mes = parseInt(isoDia[2], 10) - 1;
    const dia = parseInt(isoDia[3], 10);
    const inicio = new Date(Date.UTC(año, mes, dia));
    const fin = new Date(Date.UTC(año, mes, dia, 23, 59, 59, 999));
    return { fechaCarga: { gte: inicio, lte: fin } };
  }

  return undefined;
}

/**
 * Coincidencia parcial (ILIKE) sobre columnas visibles en la tabla de búsqueda HU-008.
 */
export function construirFiltroTextoLibre(
  busqueda: string,
): Prisma.EvidenciaWhereInput {
  const texto = busqueda.trim();
  const condiciones: Prisma.EvidenciaWhereInput[] = [
    { nombre: { contains: texto, mode: 'insensitive' } },
    { periodo: { contains: texto, mode: 'insensitive' } },
    { nombreArchivo: { contains: texto, mode: 'insensitive' } },
    {
      programa: {
        OR: [
          { nombre: { contains: texto, mode: 'insensitive' } },
          { slug: { contains: texto, mode: 'insensitive' } },
          { codigo: { contains: texto, mode: 'insensitive' } },
        ],
      },
    },
  ];

  const guias = guiasQueCoinciden(texto);
  if (guias.length > 0) {
    condiciones.push({ codigoGuia: { in: guias } });
  }

  const estados = estadosQueCoinciden(texto);
  if (estados.length > 0) {
    condiciones.push({ estado: { in: estados } });
  }

  for (const color of coloresSemaforoQueCoinciden(texto)) {
    condiciones.push(filtroSemaforo(color));
  }

  const puntaje = condicionPuntajeDesdeTexto(texto);
  if (puntaje) condiciones.push(puntaje);

  const fecha = condicionFechaCargaDesdeTexto(texto);
  if (fecha) condiciones.push(fecha);

  return { OR: condiciones };
}

/** Une resultados FTS (documento) con el filtro ampliado por subcadenas. */
export function combinarCondicionTextoLibre(
  idsFts: string[],
  textoLibre: Prisma.EvidenciaWhereInput,
): Prisma.EvidenciaWhereInput {
  if (idsFts.length === 0) return textoLibre;
  return { OR: [{ id: { in: idsFts } }, textoLibre] };
}
