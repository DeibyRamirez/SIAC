import { BadRequestException } from '@nestjs/common';
import {
  CodigoDocumentoGuia,
  EstadoEvidencia,
  RolUsuario,
} from '@prisma/client';
import {
  CampoOrdenEvidencia,
  ColorSemaforoBusqueda,
  DireccionOrden,
} from './constructor-consulta-evidencias';
import { FiltrosEvidencia } from './evidencia.repositorio';

const CODIGOS_GUIA = Object.values(CodigoDocumentoGuia) as string[];
const COLORES_SEMAFORO = ['Verde', 'Amarillo', 'Rojo', 'Gris'] as const;
const CAMPOS_ORDEN: CampoOrdenEvidencia[] = ['fechaCarga', 'puntajeActual', 'nombre'];

export interface ParametrosConsultaEvidenciasEntrada {
  q?: string;
  busqueda?: string;
  programa?: string;
  programaId?: string;
  codigoGuia?: string;
  periodo?: string;
  estado?: string;
  formato?: string;
  puntajeMin?: string;
  puntajeMax?: string;
  semaforo?: string;
  fechaCargaDesde?: string;
  fechaCargaHasta?: string;
  fechaVerificacionDesde?: string;
  fechaVerificacionHasta?: string;
  pagina?: string;
  limite?: string;
  orden?: string;
  direccion?: string;
}

function parsearEntero(valor: string | undefined, nombre: string): number | undefined {
  if (!valor) return undefined;
  const n = parseInt(valor, 10);
  if (Number.isNaN(n)) {
    throw new BadRequestException(`${nombre} debe ser un número entero.`);
  }
  return n;
}

function parsearFecha(valor: string | undefined, nombre: string): Date | undefined {
  if (!valor) return undefined;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    throw new BadRequestException(`${nombre} debe ser una fecha ISO válida.`);
  }
  return fecha;
}

function pareceUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)
    || /^c[a-z0-9]{24,}$/i.test(valor);
}

export function parsearParametrosConsultaEvidencias(
  entrada: ParametrosConsultaEvidenciasEntrada,
  opciones: { rolUsuario?: RolUsuario; usarFts?: boolean } = {},
): FiltrosEvidencia {
  const texto = entrada.q ?? entrada.busqueda;

  if (entrada.codigoGuia && !CODIGOS_GUIA.includes(entrada.codigoGuia)) {
    throw new BadRequestException('codigoGuia debe ser G1, G2, G3 o G4.');
  }

  const formato =
    entrada.formato === 'pdf' || entrada.formato === 'xlsx'
      ? entrada.formato
      : undefined;

  let semaforo: ColorSemaforoBusqueda | undefined;
  if (entrada.semaforo) {
    const normalizado =
      entrada.semaforo.charAt(0).toUpperCase() + entrada.semaforo.slice(1).toLowerCase();
    if (!COLORES_SEMAFORO.includes(normalizado as ColorSemaforoBusqueda)) {
      throw new BadRequestException('semaforo debe ser Verde, Amarillo, Rojo o Gris.');
    }
    semaforo = normalizado as ColorSemaforoBusqueda;
  }

  let orden: CampoOrdenEvidencia | undefined;
  if (entrada.orden) {
    if (!CAMPOS_ORDEN.includes(entrada.orden as CampoOrdenEvidencia)) {
      throw new BadRequestException('orden debe ser fechaCarga, puntajeActual o nombre.');
    }
    orden = entrada.orden as CampoOrdenEvidencia;
  }

  let direccion: DireccionOrden | undefined;
  if (entrada.direccion) {
    if (entrada.direccion !== 'asc' && entrada.direccion !== 'desc') {
      throw new BadRequestException('direccion debe ser asc o desc.');
    }
    direccion = entrada.direccion;
  }

  let programaId: string | undefined;
  let programaSlug: string | undefined;
  if (entrada.programa) {
    if (pareceUuid(entrada.programa)) {
      programaId = entrada.programa;
    } else {
      programaSlug = entrada.programa.toLowerCase();
    }
  } else if (entrada.programaId) {
    programaId = entrada.programaId;
  }

  return {
    busqueda: texto,
    programaId,
    programaSlug,
    codigoGuia: entrada.codigoGuia as CodigoDocumentoGuia | undefined,
    periodo: entrada.periodo,
    estado: entrada.estado as EstadoEvidencia | undefined,
    formato,
    puntajeMin: parsearEntero(entrada.puntajeMin, 'puntajeMin'),
    puntajeMax: parsearEntero(entrada.puntajeMax, 'puntajeMax'),
    semaforo,
    fechaCargaDesde: parsearFecha(entrada.fechaCargaDesde, 'fechaCargaDesde'),
    fechaCargaHasta: parsearFecha(entrada.fechaCargaHasta, 'fechaCargaHasta'),
    fechaVerificacionDesde: parsearFecha(
      entrada.fechaVerificacionDesde,
      'fechaVerificacionDesde',
    ),
    fechaVerificacionHasta: parsearFecha(
      entrada.fechaVerificacionHasta,
      'fechaVerificacionHasta',
    ),
    pagina: parsearEntero(entrada.pagina, 'pagina') ?? 1,
    limite: parsearEntero(entrada.limite, 'limite') ?? 20,
    orden,
    direccion,
    rolUsuario: opciones.rolUsuario,
    usarFts: opciones.usarFts ?? Boolean(texto?.trim()),
  };
}
