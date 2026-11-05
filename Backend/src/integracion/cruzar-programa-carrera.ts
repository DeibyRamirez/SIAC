import type { FilaPanelDto } from '../programas/panel-programas.service';
import {
  CarreraExternaDto,
  resolverUrlImagenCarrera,
} from './mapear-carrera-externa';

export interface ProgramaParaCruce {
  id: string;
  nombre: string;
  codigo?: string | null;
  codigoCu?: string | null;
  codigoSnies?: string | null;
  nivel?: string | null;
  modalidad?: string | null;
  facultad?: string | null;
  urlImagen?: string | null;
}

export interface IndiceCarrerasCuac {
  porSnies: Map<string, CarreraExternaDto>;
  porCodigoCu: Map<string, CarreraExternaDto>;
  porTitulo: Map<string, CarreraExternaDto>;
}

export interface MetadatosCatalogoCuac {
  version: string | null;
  niveles: string[];
  facultades: string[];
  modalidades: string[];
}

export function normalizarTextoCruce(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function construirIndiceCarreras(carreras: CarreraExternaDto[]): IndiceCarrerasCuac {
  const porSnies = new Map<string, CarreraExternaDto>();
  const porCodigoCu = new Map<string, CarreraExternaDto>();
  const porTitulo = new Map<string, CarreraExternaDto>();

  for (const carrera of carreras) {
    const snies = carrera.codigoSnies?.trim();
    if (snies) porSnies.set(snies, carrera);

    const codigoCu = carrera.codigoCu?.trim();
    if (codigoCu) porCodigoCu.set(codigoCu.toUpperCase(), carrera);

    const titulo = carrera.titulo?.trim();
    if (titulo) porTitulo.set(normalizarTextoCruce(titulo), carrera);
  }

  return { porSnies, porCodigoCu, porTitulo };
}

export function buscarCarreraParaPrograma(
  programa: ProgramaParaCruce,
  indice: IndiceCarrerasCuac,
): CarreraExternaDto | undefined {
  const snies = programa.codigoSnies?.trim();
  if (snies && indice.porSnies.has(snies)) {
    return indice.porSnies.get(snies);
  }

  const codigo = programa.codigo?.trim();
  if (codigo && indice.porCodigoCu.has(codigo.toUpperCase())) {
    return indice.porCodigoCu.get(codigo.toUpperCase());
  }

  const titulo = normalizarTextoCruce(programa.nombre);
  if (titulo && indice.porTitulo.has(titulo)) {
    return indice.porTitulo.get(titulo);
  }

  return undefined;
}

export function extraerMetadatosCatalogo(carreras: CarreraExternaDto[], version?: string): MetadatosCatalogoCuac {
  const niveles = new Set<string>();
  const facultades = new Set<string>();
  const modalidades = new Set<string>();

  for (const carrera of carreras) {
    if (carrera.nivel?.trim()) niveles.add(carrera.nivel.trim());
    if (carrera.facultad?.trim()) facultades.add(carrera.facultad.trim());
    if (carrera.modalidad?.trim()) modalidades.add(carrera.modalidad.trim());
  }

  return {
    version: version?.trim() || null,
    niveles: [...niveles].sort((a, b) => a.localeCompare(b, 'es')),
    facultades: [...facultades].sort((a, b) => a.localeCompare(b, 'es')),
    modalidades: [...modalidades].sort((a, b) => a.localeCompare(b, 'es')),
  };
}

export function enriquecerFilaDesdePersistencia(
  fila: FilaPanelDto,
  programa: ProgramaParaCruce & {
    tituloCuac?: string | null;
    duracionCuac?: string | null;
    creditosCuac?: number | null;
    resolucionCuac?: string | null;
    fechaResolucionCuac?: Date | null;
    imagenSlugCuac?: string | null;
  },
  baseImagenes: string,
): FilaPanelDto {
  const slug = programa.imagenSlugCuac?.trim();
  const urlDesdeSlug = slug
    ? resolverUrlImagenCarrera({ imagen: slug }, baseImagenes)
    : undefined;
  const tituloCuac = programa.tituloCuac?.trim();

  return {
    ...fila,
    nombre: tituloCuac || fila.nombre,
    tituloCatalogo: tituloCuac || undefined,
    duracion: programa.duracionCuac ?? undefined,
    creditos: programa.creditosCuac ?? undefined,
    resolucionCatalogo: programa.resolucionCuac ?? undefined,
    fechaResolucionCatalogo: programa.fechaResolucionCuac
      ? programa.fechaResolucionCuac.toISOString().slice(0, 10)
      : undefined,
    codigoSnies: programa.codigoSnies ?? undefined,
    codigoCu: programa.codigoCu ?? undefined,
    nivel: programa.nivel ?? undefined,
    facultad: programa.facultad ?? undefined,
    modalidad: programa.modalidad ?? undefined,
    imagenSlug: slug,
    urlImagen: programa.urlImagen ?? urlDesdeSlug ?? fila.urlImagen ?? undefined,
  };
}

export function enriquecerFilaPanelConCarrera(
  fila: FilaPanelDto,
  programa: ProgramaParaCruce,
  carrera: CarreraExternaDto | undefined,
  baseImagenes: string,
): FilaPanelDto {
  if (!carrera) {
    return {
      ...fila,
      tituloCatalogo: fila.nombre,
      codigoSnies: programa.codigoSnies ?? undefined,
      nivel: programa.nivel ?? undefined,
      facultad: programa.facultad ?? undefined,
      modalidad: programa.modalidad ?? undefined,
    };
  }

  const urlImagen =
    resolverUrlImagenCarrera(carrera, baseImagenes) ?? fila.urlImagen ?? programa.urlImagen ?? undefined;
  const slug = carrera.imagen?.trim() || carrera.imagenR?.trim() || undefined;

  return {
    ...fila,
    nombre: carrera.titulo?.trim() || fila.nombre,
    tituloCatalogo: carrera.titulo?.trim() || fila.nombre,
    duracion: carrera.duracion?.trim() || undefined,
    creditos: typeof carrera.creditos === 'number' ? carrera.creditos : undefined,
    resolucionCatalogo: carrera.resolucion?.trim() || undefined,
    fechaResolucionCatalogo: carrera.fechaResolucion?.trim() || undefined,
    codigoSnies: carrera.codigoSnies?.trim() || programa.codigoSnies || undefined,
    codigoCu: carrera.codigoCu?.trim() || undefined,
    nivel: carrera.nivel?.trim() || programa.nivel || undefined,
    facultad: carrera.facultad?.trim() || programa.facultad || undefined,
    modalidad: carrera.modalidad?.trim() || programa.modalidad || undefined,
    imagenSlug: slug,
    urlImagen: urlImagen ?? undefined,
  };
}

export function filtrarFilasPorCatalogo(
  filas: FilaPanelDto[],
  filtros: { nivel?: string; facultad?: string; modalidad?: string },
): FilaPanelDto[] {
  return filas.filter((fila) => {
    if (filtros.nivel && fila.nivel !== filtros.nivel) return false;
    if (filtros.facultad && fila.facultad !== filtros.facultad) return false;
    if (filtros.modalidad && fila.modalidad !== filtros.modalidad) return false;
    return true;
  });
}
