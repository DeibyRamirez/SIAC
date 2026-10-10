import { Inject, Injectable } from '@nestjs/common';
import { CategoriaCifrasDto, RespuestaCifrasDto } from './dto/cifras.dto';
import { CifrasSemillaService } from './cifras-semilla.service';
import { PROVEEDOR_CIFRAS, ProveedorCifras } from './proveedor-cifras.interface';

@Injectable()
export class CifrasService {
  constructor(
    @Inject(PROVEEDOR_CIFRAS) private readonly proveedor: ProveedorCifras,
    private readonly semilla: CifrasSemillaService,
  ) {}

  listarCategorias(): { categorias: CategoriaCifrasDto[] } {
    return { categorias: this.semilla.listarCategorias() };
  }

  obtenerEstudiantes(periodo?: string): Promise<RespuestaCifrasDto> {
    return this.proveedor.obtenerPorCategoria('estudiantes', periodo);
  }
}
