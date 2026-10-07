import { Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CategoriaCifrasDto,
  FuenteCifras,
  RespuestaCifrasDto,
} from './dto/cifras.dto';
import { ProveedorCifras } from './proveedor-cifras.interface';

const CATALOGO_CATEGORIAS: Omit<CategoriaCifrasDto, 'disponible'>[] = [
  { id: 'estudiantes', titulo: 'Estudiantes', descripcion: 'Selección y permanencia' },
  { id: 'profesores', titulo: 'Profesores', descripcion: 'Formación y experiencia' },
  { id: 'investigacion', titulo: 'Investigación', descripcion: 'Grupos y productos' },
  {
    id: 'relaciones-entorno',
    titulo: 'Relaciones entorno',
    descripcion: 'Vinculación externa',
  },
  { id: 'bienestar', titulo: 'Bienestar', descripcion: 'Modelo institucional' },
  { id: 'egresados', titulo: 'Egresados', descripcion: 'Seguimiento y empleabilidad' },
  { id: 'infraestructura', titulo: 'Infraestructura', descripcion: 'Medios educativos' },
  { id: 'aseguramiento', titulo: 'Aseguramiento', descripcion: 'SIAC y autoevaluación' },
];

const CATEGORIAS_DISPONIBLES = new Set(['estudiantes']);

@Injectable()
export class CifrasSemillaService implements ProveedorCifras {
  listarCategorias(): CategoriaCifrasDto[] {
    return CATALOGO_CATEGORIAS.map((categoria) => ({
      ...categoria,
      disponible: CATEGORIAS_DISPONIBLES.has(categoria.id),
    }));
  }

  async obtenerPorCategoria(categoriaId: string, periodo?: string): Promise<RespuestaCifrasDto> {
    if (!CATEGORIAS_DISPONIBLES.has(categoriaId)) {
      throw new NotFoundException(`La categoría «${categoriaId}» aún no tiene datos disponibles.`);
    }

    const ruta = join(__dirname, 'datos', `${categoriaId}.semilla.json`);
    const contenido = readFileSync(ruta, 'utf-8');
    const datos = JSON.parse(contenido) as RespuestaCifrasDto;

    if (periodo && datos.filtrosDisponibles?.periodos.includes(periodo)) {
      return {
        ...datos,
        meta: {
          ...datos.meta,
          periodo,
          fuente: FuenteCifras.Semilla,
        },
      };
    }

    return datos;
  }
}
