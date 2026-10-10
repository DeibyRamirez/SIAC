import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export enum FuenteCifras {
  Semilla = 'Semilla',
  BaseDatos = 'BaseDatos',
  ApiInstitucional = 'ApiInstitucional',
}

export enum FormatoIndicador {
  entero = 'entero',
  porcentaje = 'porcentaje',
  decimal = 'decimal',
  texto = 'texto',
}

export enum TipoSerieCifras {
  linea = 'linea',
  barra = 'barra',
  donut = 'donut',
}

export class PuntoSerieDto {
  @ApiProperty({ example: 'Pregrado' })
  etiqueta!: string;

  @ApiProperty({ example: 6120 })
  valor!: number;
}

export class IndicadorCifrasDto {
  @ApiProperty({ example: 'total_matriculados' })
  id!: string;

  @ApiProperty({ example: 'Total matriculados' })
  etiqueta!: string;

  @ApiProperty({ oneOf: [{ type: 'number' }, { type: 'string' }] })
  valor!: number | string;

  @ApiProperty({ example: 'personas' })
  unidad!: string;

  @ApiProperty({ enum: FormatoIndicador })
  formato!: FormatoIndicador;
}

export class SerieCifrasDto {
  @ApiProperty({ example: 'matricula_por_nivel' })
  id!: string;

  @ApiProperty({ enum: TipoSerieCifras })
  tipo!: TipoSerieCifras;

  @ApiProperty()
  titulo!: string;

  @ApiPropertyOptional()
  subtitulo?: string;

  @ApiProperty({ type: [PuntoSerieDto] })
  puntos!: PuntoSerieDto[];
}

export class MetaCifrasDto {
  @ApiProperty({ example: 'estudiantes' })
  categoriaId!: string;

  @ApiProperty({ example: 'Estudiantes' })
  titulo!: string;

  @ApiProperty({ example: '2025-1' })
  periodo!: string;

  @ApiProperty({ example: '2025-09-30T12:00:00.000Z' })
  actualizadoEn!: string;

  @ApiProperty({ enum: FuenteCifras })
  fuente!: FuenteCifras;
}

export class FiltrosDisponiblesCifrasDto {
  @ApiProperty({ type: [String], example: ['2024-2', '2025-1'] })
  periodos!: string[];

  @ApiPropertyOptional()
  programaId?: string;
}

export class RespuestaCifrasDto {
  @ApiProperty({ type: MetaCifrasDto })
  meta!: MetaCifrasDto;

  @ApiProperty({ type: [IndicadorCifrasDto] })
  indicadores!: IndicadorCifrasDto[];

  @ApiProperty({ type: [SerieCifrasDto] })
  series!: SerieCifrasDto[];

  @ApiPropertyOptional({ type: FiltrosDisponiblesCifrasDto })
  filtrosDisponibles?: FiltrosDisponiblesCifrasDto;
}

export class CategoriaCifrasDto {
  @ApiProperty({ example: 'estudiantes' })
  id!: string;

  @ApiProperty({ example: 'Estudiantes' })
  titulo!: string;

  @ApiProperty({ example: 'Selección y permanencia' })
  descripcion!: string;

  @ApiProperty({ example: true })
  disponible!: boolean;
}

export class RespuestaCategoriasCifrasDto {
  @ApiProperty({ type: [CategoriaCifrasDto] })
  categorias!: CategoriaCifrasDto[];
}

export class ConsultaCifrasQueryDto {
  @ApiPropertyOptional({ example: '2025-1' })
  @IsOptional()
  @IsString()
  periodo?: string;
}

export enum CategoriaCifrasId {
  estudiantes = 'estudiantes',
  profesores = 'profesores',
  investigacion = 'investigacion',
  relacionesEntorno = 'relaciones-entorno',
  bienestar = 'bienestar',
  egresados = 'egresados',
  infraestructura = 'infraestructura',
  aseguramiento = 'aseguramiento',
}
