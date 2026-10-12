/**
 * HU-009: catálogo único de categorías de cifras institucionales CUAC.
 * Las etiquetas visibles son las de la Corporación Universitaria Autónoma del Cauca
 * y quedan configurables por variable desde el diccionario (VariableCifra.etiquetaCuac).
 */
import { FuenteCifra } from '@prisma/client';
import { FuenteCifras } from './dto/cifras.dto';

export interface CategoriaCatalogoCifras {
  id: string;
  titulo: string;
  descripcion: string;
}

export const CATEGORIAS_CIFRAS: CategoriaCatalogoCifras[] = [
  { id: 'estudiantes', titulo: 'Estudiantes', descripcion: 'Selección y permanencia' },
  { id: 'profesores', titulo: 'Profesores', descripcion: 'Formación y experiencia' },
  { id: 'investigacion', titulo: 'Investigación', descripcion: 'Grupos y productos' },
  { id: 'relaciones-entorno', titulo: 'Relaciones entorno', descripcion: 'Vinculación externa' },
  { id: 'bienestar', titulo: 'Bienestar', descripcion: 'Modelo institucional' },
  { id: 'egresados', titulo: 'Egresados', descripcion: 'Seguimiento y empleabilidad' },
  { id: 'infraestructura', titulo: 'Infraestructura', descripcion: 'Medios educativos' },
  { id: 'aseguramiento', titulo: 'Aseguramiento', descripcion: 'SIAC y autoevaluación' },
];

export function obtenerCategoriaCatalogo(categoriaId: string): CategoriaCatalogoCifras | undefined {
  return CATEGORIAS_CIFRAS.find((categoria) => categoria.id === categoriaId);
}

export function esCategoriaCifrasValida(categoriaId: string): boolean {
  return CATEGORIAS_CIFRAS.some((categoria) => categoria.id === categoriaId);
}

export function tituloCategoriaCifras(categoriaId: string): string {
  return obtenerCategoriaCatalogo(categoriaId)?.titulo ?? categoriaId;
}

/** Traduce el enum Prisma al enum de presentación (mismos valores). */
export function fuenteCifrasDto(fuente: FuenteCifra): FuenteCifras {
  switch (fuente) {
    case FuenteCifra.API:
      return FuenteCifras.API;
    case FuenteCifra.EXCEL:
      return FuenteCifras.EXCEL;
    default:
      return FuenteCifras.SEMILLA;
  }
}
