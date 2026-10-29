import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';

export class EstadoSaludDto {
  @ApiProperty({ enum: ['ok', 'degradado'] })
  estado!: 'ok' | 'degradado';

  @ApiProperty({ enum: ['ok', 'sin_conexion'] })
  baseDatos!: 'ok' | 'sin_conexion';

  @ApiProperty({ type: Number, nullable: true, example: 12 })
  latenciaBdMs!: number | null;

  @ApiProperty({ format: 'date-time' })
  marcaTiempo!: string;
}

export class UmbralesVigenciaDto {
  @ApiProperty({ example: 7, description: 'Años de vigencia del registro. No se edita en el PATCH.' })
  aniosVigencia!: number;

  @ApiProperty({ example: 12 })
  mesesAvisoVigencia!: number;

  @ApiProperty({ example: 6 })
  mesesRojoVigencia!: number;
}

export class UsuarioSesionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty({ example: 'persona@uniautonoma.edu.co' })
  correo!: string;

  @ApiProperty({ enum: RolUsuario })
  rol!: RolUsuario;

  @ApiProperty()
  responsableProcesoInstitucional!: boolean;
}

export class UsuarioPublicoDto extends UsuarioSesionDto {
  @ApiPropertyOptional({ nullable: true })
  codigoInstitucional!: string | null;

  @ApiPropertyOptional({ nullable: true })
  cargo!: string | null;

  @ApiPropertyOptional({ nullable: true })
  dependencia!: string | null;

  @ApiProperty()
  activo!: boolean;

  @ApiPropertyOptional({ nullable: true })
  idExterno!: string | null;

  @ApiPropertyOptional({ nullable: true })
  origenDato!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  fechaSincronizacion!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class ProgramaAsignadoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  codigo!: string;

  @ApiProperty()
  slug!: string;
}

export class UsuarioConProgramasDto extends UsuarioPublicoDto {
  @ApiProperty({ type: [ProgramaAsignadoDto] })
  programasAsignados!: ProgramaAsignadoDto[];
}

export class ListaProgramasAsignadosDto {
  @ApiProperty({ type: [ProgramaAsignadoDto] })
  datos!: ProgramaAsignadoDto[];
}

export class UrlFirmadaDto {
  @ApiProperty({ description: 'URL firmada o, en disco local, ruta /api/v1/almacen-local/...' })
  url!: string;

  @ApiProperty({ description: 'Segundos de vigencia de la URL.', example: 3600 })
  expiraEn!: number;
}

export class ConteosEvidenciaDto {
  @ApiProperty()
  borrador!: number;

  @ApiProperty()
  enRevision!: number;

  @ApiProperty()
  conObservaciones!: number;

  @ApiProperty()
  cumple!: number;

  @ApiProperty()
  validado!: number;

  @ApiProperty()
  rechazado!: number;
}

export class PaginaDto {
  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  datos!: unknown[];

  @ApiProperty()
  total!: number;

  @ApiProperty({ description: 'Página solicitada, desde 1.' })
  pagina!: number;

  @ApiProperty({ description: 'Tamaño de página. Por defecto 20. Este listado no impone máximo.' })
  limite!: number;
}

export class PaginaPanelDto {
  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  datos!: unknown[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPaginas!: number;
}

export class PaginaSalidaDto extends PaginaPanelDto {}

export class ResultadoBusquedaDto {
  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  resultados!: unknown[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  pagina!: number;

  @ApiProperty()
  limite!: number;
}

export class BusquedaUnificadaDto {
  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  evidencias!: unknown[];

  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  plantillas!: unknown[];

  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  documentos!: unknown[];
}

export class InformePowerBiMetadatosDto {
  @ApiProperty({
    example: 'estudiantes',
    description: 'Identificador del catálogo de informes (ocho categorías en la API HTTP).',
  })
  categoriaId!: string;

  @ApiProperty()
  configurado!: boolean;

  @ApiProperty({ nullable: true, type: String })
  urlHash!: string | null;

  @ApiProperty()
  activo!: boolean;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  updatedAt!: string | null;
}

export class InformePowerBiUrlDto {
  @ApiProperty()
  categoriaId!: string;

  @ApiProperty({ example: 'https://app.powerbi.com/view?r=eyJ...' })
  url!: string;

  @ApiProperty()
  urlHash!: string;
}

export class EmbedTokenRespuestaDto {
  @ApiProperty()
  embedUrl!: string;

  @ApiProperty({ nullable: true, type: String })
  embedToken!: string | null;

  @ApiProperty()
  reportId!: string;

  @ApiProperty({ nullable: true, type: String })
  categoriaId!: string | null;

  @ApiProperty({ description: 'true cuando no hay credenciales Azure y se usa la URL pública o Recharts.' })
  fallback!: boolean;

  @ApiPropertyOptional()
  mensaje?: string;
}

export class ResultadoSincronizacionDto {
  @ApiProperty()
  programas!: number;

  @ApiProperty()
  usuarios!: number;

  @ApiProperty()
  vinculos!: number;

  @ApiProperty({ enum: ['API', 'CSV', 'Manual'] })
  origen!: string;
}

export class BucketStorageDto {
  @ApiProperty({ enum: ['evidencias', 'plantillas', 'documentos'] })
  tipo!: string;

  @ApiProperty()
  bucket!: string;

  @ApiProperty()
  existe!: boolean;

  @ApiPropertyOptional()
  error?: string;
}

export class EstadoStorageDto {
  @ApiProperty({ enum: ['local', 'supabase_s3'] })
  modo!: string;

  @ApiProperty()
  bucketEvidencias!: string;

  @ApiProperty()
  bucketPlantillas!: string;

  @ApiProperty()
  bucketDocumentos!: string;

  @ApiProperty()
  endpoint!: string;

  @ApiProperty({ type: [BucketStorageDto] })
  buckets!: BucketStorageDto[];
}

export class DemoVigenciaIniciadaDto {
  @ApiProperty()
  inicioAtMs!: number;

  @ApiProperty()
  duracionSeg!: number;

  @ApiProperty()
  intervaloSeg!: number;
}

export class DemoVigenciaDetenidaDto {
  @ApiProperty({ example: true })
  detenida!: boolean;
}

export class MarcaLeidaDto {
  @ApiProperty({ description: 'Filas actualizadas por updateMany.' })
  count!: number;
}
