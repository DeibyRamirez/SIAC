import { CategoriaCifrasDto, RespuestaCifrasDto } from './dto/cifras.dto';

export interface FiltrosConsultaCifras {
  facultad?: string;
  programaId?: string;
  sede?: string;
}

export interface ProveedorCifras {
  listarCategorias(): CategoriaCifrasDto[] | Promise<CategoriaCifrasDto[]>;

  obtenerPorCategoria(
    categoriaId: string,
    periodo?: string,
    filtros?: FiltrosConsultaCifras,
  ): Promise<RespuestaCifrasDto>;
}

export const PROVEEDOR_CIFRAS = Symbol('PROVEEDOR_CIFRAS');
