import { RespuestaCifrasDto } from './dto/cifras.dto';

export interface ProveedorCifras {
  obtenerPorCategoria(categoriaId: string, periodo?: string): Promise<RespuestaCifrasDto>;
}

export const PROVEEDOR_CIFRAS = Symbol('PROVEEDOR_CIFRAS');
