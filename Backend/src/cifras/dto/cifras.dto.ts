import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
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

  /** true cuando la categoría tiene datos en el periodo pero los filtros dejan 0 registros. */
  @ApiPropertyOptional({ example: false })
  sinCoincidencias?: boolean;
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

export class EsquemaColumnaCifrasDto {
  @ApiProperty({ example: 'facultad' })
  encabezado!: string;

  @ApiProperty({ example: 'facultad' })
  clave!: string;

  @ApiProperty({ enum: ['texto', 'periodo', 'codigo', 'fecha', 'entero', 'decimal', 'enum'] })
  tipo!: string;

  @ApiProperty({ example: true })
  obligatoria!: boolean;

  @ApiPropertyOptional({ type: [String], example: ['Femenino', 'Masculino'] })
  enum?: string[];

  @ApiPropertyOptional({ example: 'Planta docente según vinculación.' })
  descripcion?: string;
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

  /** Columnas del esquema tipado (S3-03) para las categorías cargadas por registros. */
  @ApiPropertyOptional({ type: [EsquemaColumnaCifrasDto] })
  esquema?: EsquemaColumnaCifrasDto[];
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

  @ApiPropertyOptional({
    example: 'Ingeniería Agropecuaria',
    description: 'Nombre del programa en los registros (alternativa a programaId).',
  })
  @IsOptional()
  @IsString()
  programa?: string;

  @ApiPropertyOptional({ example: 'Popayán' })
  @IsOptional()
  @IsString()
  sede?: string;
}

export class ConsultaFiltrosCifrasQueryDto {
  @ApiPropertyOptional({ example: '2023-2', description: 'AAAA o AAAA-S (ej. 2023-2).' })
  @IsOptional()
  @IsString()
  @Matches(REGEX_PERIODO_CIFRAS, { message: MENSAJE_PERIODO_INVALIDO })
  periodo?: string;

  @ApiPropertyOptional({
    example: 'Facultad de Ciencias Agrarias',
    description: 'Filtra los programas disponibles a esa facultad.',
  })
  @IsOptional()
  @IsString()
  facultad?: string;
}

export class RespuestaFiltrosCifrasDto {
  @ApiProperty({ type: [String], example: ['2023-2'] })
  periodos!: string[];

  @ApiProperty({ type: [String], example: ['Facultad de Ciencias Agrarias'] })
  facultades!: string[];

  @ApiProperty({ type: [String], example: ['Ingeniería Agropecuaria'] })
  programas!: string[];

  @ApiProperty({
    type: [String],
    example: ['Claustro El Carmen'],
    description: 'Solo infraestructura (sede en lugar de facultad/programa).',
  })
  sedes!: string[];
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

  @ApiPropertyOptional({ example: 'estrato' })
  columna?: string;

  @ApiProperty({ example: 'Fila 7, columna estrato: debe ser un entero entre 1 y 6' })
  mensaje!: string;
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

  @ApiPropertyOptional({
    type: [String],
    example: ['2023-2'],
    description: 'Periodos (o sedes) reemplazados por la carga.',
  })
  periodosReemplazados?: string[];
}

export class PlantillaJsonCifrasDto {
  @ApiProperty({ example: 'estudiantes' })
  categoriaId!: string;

  @ApiPropertyOptional({ example: 'Estudiantes' })
  titulo?: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    example: [{ programa: 'Ingeniería Agropecuaria', periodo_academico: '2023-2' }],
  })
  registros!: Array<Record<string, unknown>>;
}

export class FiltrosFeedCifrasQueryDto {
  @ApiPropertyOptional({ example: '2023-2', description: 'AAAA o AAAA-S (ej. 2023-2).' })
  @IsOptional()
  @IsString()
  @Matches(REGEX_PERIODO_CIFRAS, { message: MENSAJE_PERIODO_INVALIDO })
  periodo?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @ApiPropertyOptional({ example: 1000, default: 1000, maximum: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  tamano?: number;

  @ApiPropertyOptional({ example: 'Claustro El Carmen' })
  @IsOptional()
  @IsString()
  sede?: string;
}

export class RespuestaFeedCifrasDto {
  @ApiProperty({ example: 'estudiantes' })
  categoriaId!: string;

  @ApiPropertyOptional({ example: '2023-2', nullable: true })
  periodo?: string | null;

  @ApiProperty({ example: 1 })
  pagina!: number;

  @ApiProperty({ example: 1000 })
  tamano!: number;

  @ApiProperty({ example: 15804 })
  totalRegistros!: number;

  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  registros!: Array<Record<string, unknown>>;
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
