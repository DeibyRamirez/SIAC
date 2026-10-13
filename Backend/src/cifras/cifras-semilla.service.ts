import { Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATEGORIAS_CIFRAS } from './catalogo-categorias';
import {
  CategoriaCifrasDto,
  FuenteCifras,
  RespuestaCifrasDto,
} from './dto/cifras.dto';
import { FiltrosConsultaCifras, ProveedorCifras } from './proveedor-cifras.interface';

/** Categorías con archivo de respaldo (`datos/<categoriaId>.semilla.json`). */
const CATEGORIAS_CON_SEMILLA = new Set(['estudiantes']);

@Injectable()
export class CifrasSemillaService implements ProveedorCifras {
  listarCategorias(): CategoriaCifrasDto[] {
    return CATEGORIAS_CIFRAS.map((categoria) => ({
      ...categoria,
      disponible: CATEGORIAS_CON_SEMILLA.has(categoria.id),
    }));
  }

  tieneDatos(categoriaId: string): boolean {
    return CATEGORIAS_CON_SEMILLA.has(categoriaId);
  }

  async obtenerPorCategoria(
    categoriaId: string,
    periodo?: string,
    _filtros?: FiltrosConsultaCifras,
  ): Promise<RespuestaCifrasDto> {
    if (!CATEGORIAS_CON_SEMILLA.has(categoriaId)) {
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
          fuente: FuenteCifras.SEMILLA,
        },
      };
    }

    return {
      ...datos,
      meta: { ...datos.meta, fuente: FuenteCifras.SEMILLA },
    };
  }
}
