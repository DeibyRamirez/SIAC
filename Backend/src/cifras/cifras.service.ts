import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VariableCifra } from '@prisma/client';
import { CATEGORIAS_CIFRAS, esCategoriaCifrasValida } from './catalogo-categorias';
import { CifrasImportacionService } from './cifras-importacion.service';
import { CifrasRepositorio } from './cifras.repositorio';
import {
  ActualizarVariableCifraDto,
  CategoriaCifrasDto,
  ConsultaCifrasQueryDto,
  RespuestaCifrasDto,
  RespuestaVariablesCifrasDto,
  VariableCifraDto,
} from './dto/cifras.dto';
import { IngestaCifrasDto } from './dto/ingesta-cifras.dto';
import { PROVEEDOR_CIFRAS, ProveedorCifras } from './proveedor-cifras.interface';

@Injectable()
export class CifrasService {
  constructor(
    @Inject(PROVEEDOR_CIFRAS) private readonly proveedor: ProveedorCifras,
    private readonly repositorio: CifrasRepositorio,
    private readonly importacion: CifrasImportacionService,
  ) {}

  async listarCategorias(): Promise<{ categorias: CategoriaCifrasDto[] }> {
    return { categorias: await this.proveedor.listarCategorias() };
  }

  async listarVariables(categoriaId?: string): Promise<RespuestaVariablesCifrasDto> {
    if (categoriaId) {
      this.validarCategoria(categoriaId, 'consulta');
    }
    const variables = await this.repositorio.listarVariables(categoriaId);
    return { variables: variables.map((variable) => this.aVariableDto(variable)) };
  }

  async actualizarVariable(
    id: string,
    dto: ActualizarVariableCifraDto,
  ): Promise<VariableCifraDto> {
    if (
      dto.etiquetaCuac === undefined &&
      dto.descripcion === undefined &&
      dto.activo === undefined
    ) {
      throw new BadRequestException(
        'Indique al menos un campo a actualizar (etiquetaCuac, descripcion o activo).',
      );
    }

    const variable = await this.repositorio.buscarVariablePorId(id);
    if (!variable) {
      throw new NotFoundException('La variable de cifras no existe.');
    }

    const actualizada = await this.repositorio.actualizarVariable(id, {
      ...(dto.etiquetaCuac !== undefined ? { etiquetaCuac: dto.etiquetaCuac.trim() } : {}),
      ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion } : {}),
      ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
    });

    return this.aVariableDto(actualizada);
  }

  obtenerCategoria(
    categoriaId: string,
    consulta: ConsultaCifrasQueryDto = {},
  ): Promise<RespuestaCifrasDto> {
    return this.proveedor.obtenerPorCategoria(categoriaId, consulta.periodo, {
      facultad: consulta.facultad,
      programaId: consulta.programaId,
      sede: consulta.sede,
    });
  }

  /** Compatibilidad con el endpoint heredado GET /cifras/estudiantes?periodo= */
  obtenerEstudiantes(periodo?: string): Promise<RespuestaCifrasDto> {
    return this.obtenerCategoria('estudiantes', { periodo });
  }

  ingestar(categoriaId: string, dto: IngestaCifrasDto, usuarioId?: string) {
    return this.importacion.ingestarPorApi(categoriaId, dto, usuarioId);
  }

  importarExcel(
    categoriaId: string,
    archivo: Express.Multer.File,
    usuarioId?: string,
  ) {
    return this.importacion.importarExcel(categoriaId, archivo, usuarioId);
  }

  generarPlantilla(categoriaId: string) {
    return this.importacion.generarPlantilla(categoriaId);
  }

  private validarCategoria(categoriaId: string, origen: 'consulta' | 'escritura'): void {
    if (esCategoriaCifrasValida(categoriaId)) {
      return;
    }
    const mensaje = `La categoría «${categoriaId}» no existe. Use: ${CATEGORIAS_CIFRAS.map((categoria) => categoria.id).join(', ')}.`;
    throw origen === 'consulta'
      ? new BadRequestException(mensaje)
      : new NotFoundException(mensaje);
  }

  private aVariableDto(variable: VariableCifra): VariableCifraDto {
    return {
      id: variable.id,
      categoriaId: variable.categoriaId,
      clave: variable.clave,
      etiquetaCuac: variable.etiquetaCuac,
      descripcion: variable.descripcion ?? undefined,
      unidad: variable.unidad,
      dimensiones: variable.dimensiones,
      activo: variable.activo,
      actualizadoEn: variable.updatedAt.toISOString(),
    };
  }
}
