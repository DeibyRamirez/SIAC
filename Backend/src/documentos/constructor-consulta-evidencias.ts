import {
  CodigoDocumentoGuia,
  EstadoEvidencia,
  Prisma,
  RolUsuario,
} from '@prisma/client';
import {
  UMBRALES_SEMAFORO_POR_DEFECTO,
  escalarUmbralBusqueda,
} from '../dominio/puntaje-condiciones';

const CODIGOS_GUIA = Object.values(CodigoDocumentoGuia) as string[];

const TOTALES_CONDICIONES = [6, 9];

export type CampoOrdenEvidencia = 'fechaCarga' | 'puntajeActual' | 'nombre';
export type DireccionOrden = 'asc' | 'desc';
export type ColorSemaforoBusqueda = 'Verde' | 'Amarillo' | 'Rojo' | 'Gris';

export interface FiltrosConsultaEvidencias {
  busqueda?: string;
  programaId?: string;
  programaSlug?: string;
  codigoGuia?: CodigoDocumentoGuia;
  periodo?: string;
  estado?: EstadoEvidencia;
  formato?: 'pdf' | 'xlsx';
  puntajeMin?: number;
  puntajeMax?: number;
  semaforo?: ColorSemaforoBusqueda;
  fechaCargaDesde?: Date;
  fechaCargaHasta?: Date;
  fechaVerificacionDesde?: Date;
  fechaVerificacionHasta?: Date;
  idsFts?: string[];
  /** Par académico ignora filtro estado explícito. */
  rolUsuario?: RolUsuario;
}

export interface OpcionesConsultaEvidencias {
  pagina?: number;
  limite?: number;
  orden?: CampoOrdenEvidencia;
  direccion?: DireccionOrden;
}

const ESTADOS_VERIFICACION: EstadoEvidencia[] = [
  EstadoEvidencia.Cumple,
  EstadoEvidencia.ConObservaciones,
  EstadoEvidencia.Validado,
  EstadoEvidencia.Rechazado,
];

function guiaDesdeTexto(texto: string): CodigoDocumentoGuia | undefined {
  const normalizado = texto.trim().toUpperCase();
  return CODIGOS_GUIA.includes(normalizado)
    ? (normalizado as CodigoDocumentoGuia)
    : undefined;
}

function filtroFormato(formato: 'pdf' | 'xlsx'): Prisma.EvidenciaWhereInput {
  if (formato === 'pdf') {
    return {
      OR: [
        { mimeType: { contains: 'pdf', mode: 'insensitive' } },
        { nombreArchivo: { endsWith: '.pdf', mode: 'insensitive' } },
      ],
    };
  }
  return {
    OR: [
      { mimeType: { contains: 'spreadsheet', mode: 'insensitive' } },
      { nombreArchivo: { endsWith: '.xlsx', mode: 'insensitive' } },
    ],
  };
}

function filtroTextoIlike(busqueda: string): Prisma.EvidenciaWhereInput {
  const guiaEnTexto = guiaDesdeTexto(busqueda);
  const condicionesTexto: Prisma.EvidenciaWhereInput[] = [
    { nombre: { contains: busqueda, mode: 'insensitive' } },
    { periodo: { contains: busqueda, mode: 'insensitive' } },
    { nombreArchivo: { contains: busqueda, mode: 'insensitive' } },
    ...(guiaEnTexto ? [{ codigoGuia: guiaEnTexto }] : []),
  ];
  return { OR: condicionesTexto };
}

function filtroSemaforo(color: ColorSemaforoBusqueda): Prisma.EvidenciaWhereInput {
  if (color === 'Gris') {
    return { puntajeActual: null };
  }

  const condicionesPorTotal = TOTALES_CONDICIONES.map((total) => {
    const minVerde = escalarUmbralBusqueda(
      UMBRALES_SEMAFORO_POR_DEFECTO.minimoVerde,
      total,
    );
    const minAmarillo = escalarUmbralBusqueda(
      UMBRALES_SEMAFORO_POR_DEFECTO.minimoAmarillo,
      total,
    );

    if (color === 'Verde') {
      return {
        AND: [
          { totalCondicionesActual: total },
          { puntajeActual: { gte: minVerde } },
        ],
      };
    }
    if (color === 'Amarillo') {
      return {
        AND: [
          { totalCondicionesActual: total },
          { puntajeActual: { gte: minAmarillo, lt: minVerde } },
        ],
      };
    }
    return {
      AND: [
        { totalCondicionesActual: total },
        { puntajeActual: { gte: 0, lt: minAmarillo } },
      ],
    };
  });

  return { OR: condicionesPorTotal };
}

function filtroRangoFechas(
  campo: 'fechaCarga' | 'historialVerificacion',
  desde?: Date,
  hasta?: Date,
): Prisma.EvidenciaWhereInput | undefined {
  if (!desde && !hasta) return undefined;

  if (campo === 'fechaCarga') {
    const rango: Prisma.DateTimeFilter = {};
    if (desde) rango.gte = desde;
    if (hasta) rango.lte = hasta;
    return { fechaCarga: rango };
  }

  const rangoHistorial: Prisma.DateTimeFilter = {};
  if (desde) rangoHistorial.gte = desde;
  if (hasta) rangoHistorial.lte = hasta;

  return {
    historial: {
      some: {
        estado: { in: ESTADOS_VERIFICACION },
        createdAt: rangoHistorial,
      },
    },
  };
}

/**
 * Constructor único de filtros facetados para GET /busqueda y GET /evidencias.
 * El texto libre usa FTS cuando hay idsFts; si no, ILIKE como respaldo.
 */
export function construirFiltrosConsultaEvidencias(
  filtros: FiltrosConsultaEvidencias,
): Prisma.EvidenciaWhereInput {
  const partes: Prisma.EvidenciaWhereInput[] = [];

  if (filtros.rolUsuario !== RolUsuario.ParAcademico && filtros.estado) {
    partes.push({ estado: filtros.estado });
  }

  if (filtros.programaId) {
    partes.push({ programaId: filtros.programaId });
  } else if (filtros.programaSlug) {
    partes.push({ programa: { slug: filtros.programaSlug } });
  }

  if (filtros.codigoGuia) partes.push({ codigoGuia: filtros.codigoGuia });
  if (filtros.periodo) partes.push({ periodo: filtros.periodo });
  if (filtros.formato) partes.push(filtroFormato(filtros.formato));

  if (filtros.puntajeMin !== undefined || filtros.puntajeMax !== undefined) {
    const puntaje: Prisma.IntNullableFilter = {};
    if (filtros.puntajeMin !== undefined) puntaje.gte = filtros.puntajeMin;
    if (filtros.puntajeMax !== undefined) puntaje.lte = filtros.puntajeMax;
    partes.push({ puntajeActual: puntaje });
  }

  if (filtros.semaforo) {
    partes.push(filtroSemaforo(filtros.semaforo));
  }

  const rangoCarga = filtroRangoFechas(
    'fechaCarga',
    filtros.fechaCargaDesde,
    filtros.fechaCargaHasta,
  );
  if (rangoCarga) partes.push(rangoCarga);

  const rangoVerificacion = filtroRangoFechas(
    'historialVerificacion',
    filtros.fechaVerificacionDesde,
    filtros.fechaVerificacionHasta,
  );
  if (rangoVerificacion) partes.push(rangoVerificacion);

  if (filtros.idsFts?.length) {
    partes.push({ id: { in: filtros.idsFts } });
  } else if (filtros.busqueda?.trim()) {
    partes.push(filtroTextoIlike(filtros.busqueda.trim()));
  }

  if (partes.length === 0) return {};
  if (partes.length === 1) return partes[0];
  return { AND: partes };
}

export function construirOrdenConsultaEvidencias(
  opciones: OpcionesConsultaEvidencias,
): Prisma.EvidenciaOrderByWithRelationInput {
  const campo = opciones.orden ?? 'fechaCarga';
  const direccion = opciones.direccion ?? 'desc';
  return { [campo]: direccion };
}

export function combinarConAlcance(
  filtros: Prisma.EvidenciaWhereInput,
  alcance?: Prisma.EvidenciaWhereInput,
): Prisma.EvidenciaWhereInput {
  if (!alcance || Object.keys(alcance).length === 0) return filtros;
  if (!filtros || Object.keys(filtros).length === 0) return alcance;
  return { AND: [alcance, filtros] };
}
