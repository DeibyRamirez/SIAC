import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  Matches,
} from 'class-validator';
import { MaxTextoLargo } from '../../common/validacion/limites-texto';
import { CodigoDocumentoGuia, EstadoEvidencia } from '@prisma/client';
import {
  MENSAJE_FORMATO_PERIODO,
  REGEX_PERIODO_ACADEMICO,
} from '../../dominio/periodo-academico';

export class CrearEvidenciaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  /** Obligatorio para G1/G2; omitir en evidencias institucionales G3/G4. */
  @ApiPropertyOptional({ description: 'Obligatorio para G1/G2. Se omite en evidencias institucionales G3/G4.' })
  @IsString()
  @IsOptional()
  programaId?: string;

  @ApiProperty({
    example: '2026-1',
    pattern: '^\\d{4}-[12]$',
    description: 'Periodo académico AAAA-1 o AAAA-2.',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(REGEX_PERIODO_ACADEMICO, { message: MENSAJE_FORMATO_PERIODO })
  periodo!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  responsable?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  documentoRequeridoId?: string;

  @ApiPropertyOptional({ description: 'En multipart llega como texto.' })
  @IsOptional()
  requiereChecklistMaestro?: string;

  @ApiPropertyOptional({ enum: CodigoDocumentoGuia })
  @IsEnum(CodigoDocumentoGuia)
  @IsOptional()
  codigoGuia?: CodigoDocumentoGuia;
}

export class ActualizarEvidenciaDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ example: '2026-1', pattern: '^\\d{4}-[12]$' })
  @IsString()
  @IsOptional()
  @Matches(REGEX_PERIODO_ACADEMICO, { message: MENSAJE_FORMATO_PERIODO })
  periodo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  responsable?: string;
}

export class DictaminarEvidenciaDto {
  @ApiProperty({ enum: EstadoEvidencia })
  @IsEnum(EstadoEvidencia)
  estado!: EstadoEvidencia;

  @ApiPropertyOptional({ maxLength: 600 })
  @IsString()
  @IsOptional()
  @MaxTextoLargo('Las observaciones')
  observaciones?: string;
}

export class FiltrosEvidenciaDto {
  @ApiPropertyOptional({ description: 'Texto de búsqueda. Equivale a busqueda.' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ description: 'Id o slug del programa.' })
  @IsString()
  @IsOptional()
  programa?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  programaId?: string;

  @ApiPropertyOptional({ example: '2026-1' })
  @IsString()
  @IsOptional()
  periodo?: string;

  @ApiPropertyOptional({ enum: CodigoDocumentoGuia })
  @IsEnum(CodigoDocumentoGuia)
  @IsOptional()
  codigoGuia?: CodigoDocumentoGuia;

  @ApiPropertyOptional({ enum: EstadoEvidencia })
  @IsString()
  @IsOptional()
  estado?: string;

  @ApiPropertyOptional({ description: 'Alias de q.' })
  @IsString()
  @IsOptional()
  busqueda?: string;

  @ApiPropertyOptional({ enum: ['pdf', 'xlsx'], description: 'Otro valor se ignora.' })
  @IsString()
  @IsOptional()
  formato?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  puntajeMin?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  puntajeMax?: string;

  @ApiPropertyOptional({ enum: ['Verde', 'Amarillo', 'Rojo', 'Gris'] })
  @IsString()
  @IsOptional()
  semaforo?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsString()
  @IsOptional()
  fechaCargaDesde?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsString()
  @IsOptional()
  fechaCargaHasta?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsString()
  @IsOptional()
  fechaVerificacionDesde?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsString()
  @IsOptional()
  fechaVerificacionHasta?: string;

  @ApiPropertyOptional({ default: '1', description: 'Entero en texto. Por defecto 1.' })
  @IsString()
  @IsOptional()
  pagina?: string;

  @ApiPropertyOptional({ default: '20', description: 'Entero en texto. Por defecto 20. Sin tope máximo.' })
  @IsString()
  @IsOptional()
  limite?: string;

  @ApiPropertyOptional({ enum: ['fechaCarga', 'puntajeActual', 'nombre'] })
  @IsString()
  @IsOptional()
  orden?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  direccion?: string;
}
