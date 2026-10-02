import { generarSlug } from '../common/alcance/generar-slug';

/** Payload de carrera desde la API externa CUAC. */
export interface CarreraExternaDto {
  _id: string;
  titulo: string;
  modalidad?: string;
  duracion?: string;
  imagen?: string;
  urlImagen?: string | null;
  facultad?: string;
  activo?: boolean;
  descripcion?: string;
  videoUrl?: string;
  imagenR?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface OpcionesMapeoCarreras {
  /** Origen público de imágenes (p. ej. https://sitio-cuac.vercel.app). */
  baseImagenes?: string;
}

export interface RespuestaCarrerasExternasDto {
  success: boolean;
  cantidad?: number;
  carreras: CarreraExternaDto[];
}

/** Campos de catálogo que SIAC importa desde la API de carreras. */
export interface ProgramaCatalogoExterno {
  idExterno: string;
  codigo: string;
  nombre: string;
  slug: string;
  nivel: string;
  modalidad?: string;
  facultad?: string;
  duracionSemestres?: number;
  urlImagen?: string;
  activo: boolean;
}

const NIVEL_DEFECTO = 'Pregrado';
const MAX_CODIGO = 20;

export function parsearDuracionSemestres(duracion?: string): number | undefined {
  if (!duracion?.trim()) return undefined;
  const coincidencia = duracion.match(/(\d+)/);
  if (!coincidencia) return undefined;
  const valor = Number.parseInt(coincidencia[1], 10);
  return Number.isFinite(valor) && valor > 0 ? valor : undefined;
}

export function esUrlImagenValida(imagen?: string): boolean {
  if (!imagen?.trim()) return false;
  return /^https?:\/\//i.test(imagen.trim());
}

function esUrlLocal(imagen: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(imagen.trim());
}

function unirBaseYruta(base: string, ruta: string): string {
  const baseLimpia = base.replace(/\/$/, '');
  const rutaLimpia = ruta.startsWith('/') ? ruta : `/${ruta}`;
  return `${baseLimpia}${rutaLimpia}`;
}

function rutaDesdeSlugImagen(slug: string): string {
  const limpio = slug.replace(/^\/+/, '');
  if (limpio.includes('/')) {
    return limpio.startsWith('/') ? limpio : `/${limpio}`;
  }
  return limpio.includes('.') ? `/Carreras/${limpio}` : `/Carreras/${limpio}.png`;
}

/**
 * Resuelve la URL de imagen de carrera para Programa.urlImagen.
 * Prioridad: urlImagen de la API → imagen (URL o slug) → imagenR.
 */
export function resolverUrlImagenCarrera(
  carrera: Pick<CarreraExternaDto, 'urlImagen' | 'imagen' | 'imagenR'>,
  baseImagenes?: string,
): string | undefined {
  const candidatos = [carrera.urlImagen, carrera.imagen, carrera.imagenR];

  for (const raw of candidatos) {
    if (raw == null) continue;
    const valor = String(raw).trim();
    if (!valor) continue;

    if (esUrlImagenValida(valor)) {
      if (esUrlLocal(valor)) {
        if (!baseImagenes) continue;
        try {
          return unirBaseYruta(baseImagenes, new URL(valor).pathname);
        } catch {
          continue;
        }
      }
      return valor;
    }

    const ruta = rutaDesdeSlugImagen(valor);
    if (baseImagenes) {
      return unirBaseYruta(baseImagenes, ruta);
    }
    return ruta;
  }

  return undefined;
}

const PALABRAS_OMITIR_CODIGO = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'a']);

export function generarCodigoPrograma(titulo: string, idExterno?: string): string {
  const palabras = titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter((p) => p.length > 0 && !PALABRAS_OMITIR_CODIGO.has(p.toLowerCase()));

  let codigo = palabras
    .map((p) => p.slice(0, 3).toUpperCase())
    .join('-')
    .slice(0, MAX_CODIGO);

  if (!codigo) {
    codigo = 'PROG';
  }

  if (codigo.length > MAX_CODIGO - 4 && idExterno) {
    codigo = `${codigo.slice(0, MAX_CODIGO - 4)}-${idExterno.slice(-3).toUpperCase()}`;
  }

  return codigo.slice(0, MAX_CODIGO);
}

export function mapearCarreraExterna(
  carrera: CarreraExternaDto,
  opciones?: OpcionesMapeoCarreras,
): ProgramaCatalogoExterno | null {
  const titulo = carrera.titulo?.trim();
  const idExterno = carrera._id?.trim();

  if (!titulo || !idExterno) return null;

  const codigo = generarCodigoPrograma(titulo, idExterno);
  const slugBase = generarSlug(titulo);
  const slug = slugBase === 'programa' ? generarSlug(`${titulo}-${idExterno.slice(-6)}`) : slugBase;

  return {
    idExterno,
    codigo,
    nombre: titulo,
    slug,
    nivel: NIVEL_DEFECTO,
    modalidad: carrera.modalidad?.trim() || undefined,
    facultad: carrera.facultad?.trim() || undefined,
    duracionSemestres: parsearDuracionSemestres(carrera.duracion),
    urlImagen: resolverUrlImagenCarrera(carrera, opciones?.baseImagenes),
    activo: carrera.activo !== false,
  };
}

export function resolverSlugUnicoEnLote(
  slugBase: string,
  idExterno: string,
  slugsUsados: Set<string>,
): string {
  let candidato =
    slugBase === 'programa'
      ? generarSlug(`${idExterno}`)
      : slugBase;

  if (!slugsUsados.has(candidato)) {
    slugsUsados.add(candidato);
    return candidato;
  }

  candidato = generarSlug(`${slugBase}-${idExterno.slice(-6)}`);
  if (!slugsUsados.has(candidato)) {
    slugsUsados.add(candidato);
    return candidato;
  }

  candidato = generarSlug(idExterno);
  slugsUsados.add(candidato);
  return candidato;
}

export function mapearCarrerasExternas(
  carreras: CarreraExternaDto[],
  opciones?: OpcionesMapeoCarreras,
): ProgramaCatalogoExterno[] {
  const codigosUsados = new Set<string>();
  const slugsUsados = new Set<string>();
  const resultado: ProgramaCatalogoExterno[] = [];

  for (const carrera of carreras) {
    const mapeado = mapearCarreraExterna(carrera, opciones);
    if (!mapeado) continue;

    let codigo = mapeado.codigo;
    let sufijo = 1;
    while (codigosUsados.has(codigo)) {
      const base = mapeado.codigo.slice(0, MAX_CODIGO - 2);
      codigo = `${base}${sufijo}`.slice(0, MAX_CODIGO);
      sufijo++;
    }
    codigosUsados.add(codigo);

    const slug = resolverSlugUnicoEnLote(mapeado.slug, mapeado.idExterno, slugsUsados);

    resultado.push({ ...mapeado, codigo, slug });
  }

  return resultado;
}
