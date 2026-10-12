import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import {
  MENSAJE_PERIODO_INVALIDO,
  REGEX_PERIODO_CIFRAS,
} from '../periodo-cifras';

export enum FuenteCifras {
  API = 'API',
  EXCEL = 'EXCEL',
  SEMILLA = 'SEMILLA',
  MIXTA = 'MIXTA',
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

export class DesgloseCifraDto {
  @ApiPropertyOptional({ example: 'vinculacion' })
  dimension?: string;

  @ApiPropertyOptional({ example: 'Tiempo completo' })
  valorDimension?: string;

  @ApiPropertyOptional({ example: 'Ingeniería' })
  facultad?: string;

  @ApiProperty({ example: 120 })
  valor!: number;
}

export class IndicadorCifrasDto {
  @ApiProperty({ example: 'por_vinculacion' })
  clave!: string;

  /** Alias heredado del modelo anterior (HU-009 lo mantiene para el panel actual). */
  @ApiPropertyOptional({ example: 'por_vinculacion' })
  id?: string;

  @ApiProperty({ example: 'Profesores por vinculación' })
  etiqueta!: string;

  @ApiProperty({ example: 'conteo' })
  unidad!: string;

  @ApiPropertyOptional({ enum: FormatoIndicador })
  formato?: FormatoIndicador;

  @ApiProperty({ example: 98 })
  total!: number;

  /** Alias heredado del modelo anterior. */
  @ApiPropertyOptional({ example: 98 })
  valor?: number;

  @ApiProperty({ enum: FuenteCifras, example: FuenteCifras.EXCEL })
  fuente!: FuenteCifras;

  @ApiProperty({ type: [DesgloseCifraDto], example: [] })
  desglose!: DesgloseCifraDto[];
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

  @ApiProperty({ enum: FuenteCifras, example: FuenteCifras.EXCEL })
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

  @ApiProperty({ type: [SerieCifrasDto], example: [] })
  series!: SerieCifrasDto[];

  @ApiProperty({ type: [String], example: ['2024-2', '2025-1'] })
  periodosDisponibles!: string[];

  @ApiPropertyOptional({ type: FiltrosDisponiblesCifrasDto })
  filtrosDisponibles?: FiltrosDisponiblesCifrasDto;
}

export class VariableCifraResumenDto {
  @ApiProperty({ example: 'por_vinculacion' })
  clave!: string;

  @ApiProperty({ example: 'Profesores por vinculación' })
  etiquetaCuac!: string;

  @ApiPropertyOptional({ example: 'Planta docente según tipo de vinculación.' })
  descripcion?: string;

  @ApiProperty({ example: 'conteo' })
  unidad!: string;

  @ApiProperty({ type: [String], example: ['vinculacion'] })
  dimensiones!: string[];
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

  @ApiPropertyOptional({ type: [VariableCifraResumenDto] })
  variables?: VariableCifraResumenDto[];
}

export class RespuestaCategoriasCifrasDto {
  @ApiProperty({ type: [CategoriaCifrasDto] })
  categorias!: CategoriaCifrasDto[];
}

export class VariableCifraDto extends VariableCifraResumenDto {
  @ApiProperty({ example: 'clx1234567890' })
  id!: string;

  @ApiProperty({ example: 'profesores' })
  categoriaId!: string;

  @ApiProperty({ example: true })
  activo!: boolean;

  @ApiProperty({ example: '2025-09-30T12:00:00.000Z' })
  actualizadoEn!: string;
}

export class RespuestaVariablesCifrasDto {
  @ApiProperty({ type: [VariableCifraDto] })
  variables!: VariableCifraDto[];
}

export class ConsultaCifrasQueryDto {
  @ApiPropertyOptional({ example: '2025-1', description: 'AAAA o AAAA-S (ej. 2025-1).' })
  @IsOptional()
  @IsString()
  @Matches(REGEX_PERIODO_CIFRAS, { message: MENSAJE_PERIODO_INVALIDO })
  periodo?: string;

  @ApiPropertyOptional({ example: 'Ingeniería' })
  @IsOptional()
  @IsString()
  facultad?: string;

  @ApiPropertyOptional({ example: 'clx1234567890' })
  @IsOptional()
  @IsString()
  programaId?: string;

  @ApiPropertyOptional({ example: 'Popayán' })
  @IsOptional()
  @IsString()
  sede?: string;
}

export class ConsultaVariablesCifrasQueryDto {
  @ApiPropertyOptional({ example: 'profesores' })
  @IsOptional()
  @IsString()
  categoriaId?: string;
}

export class ActualizarVariableCifraDto {
  @ApiPropertyOptional({ example: 'Profesores por tipo de vinculación' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'La etiqueta CUAC no puede estar vacía.' })
  etiquetaCuac?: string;

  @ApiPropertyOptional({ example: 'Planta docente según vinculación con la institución.' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class ErrorFilaIngestaDto {
  @ApiProperty({ example: 7 })
  fila!: number;

  @ApiPropertyOptional({ example: 'xyz' })
  clave?: string;

  @ApiProperty({ example: "Fila 7: la clave 'xyz' no existe en Profesores" })
  motivo!: string;
}

export class RespuestaIngestaCifrasDto {
  @ApiProperty({ example: 4 })
  filasOk!: number;

  @ApiProperty({ example: 1 })
  filasError!: number;

  @ApiProperty({ type: [ErrorFilaIngestaDto] })
  errores!: ErrorFilaIngestaDto[];

  @ApiProperty({ enum: FuenteCifras, example: FuenteCifras.EXCEL })
  fuente!: FuenteCifras;
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
