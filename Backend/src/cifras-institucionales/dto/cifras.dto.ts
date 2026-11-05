import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class EnvioCifrasDto {
  @ApiPropertyOptional({
    example: '2026-1',
    description: 'Periodo del lote. Si se envía, todas las filas deben pertenecer a él. No aplica a infraestructura.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  periodo?: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    description: 'Registros de la categoría. Máximo 5000. Si uno falla, no se escribe nada.',
  })
  @IsArray({ message: 'registros debe ser un arreglo.' })
  @ArrayMinSize(1, { message: 'El lote no contiene registros.' })
  registros!: unknown[];
}

export class ConsultaCifrasDto {
  @ApiPropertyOptional({ default: '1', description: 'Entero en texto. Por defecto 1.' })
  @IsOptional()
  @IsString()
  pagina?: string;

  @ApiPropertyOptional({
    default: '20',
    description: 'Entero en texto. Por defecto 20. Máximo 500.',
  })
  @IsOptional()
  @IsString()
  limite?: string;

  @ApiPropertyOptional({ example: '2026-1', description: 'Filtra el ámbito de periodo cuando la categoría lo tiene.' })
  @IsOptional()
  @IsString()
  periodo?: string;

  @ApiPropertyOptional({ description: 'Filtra por sede. Solo infraestructura.' })
  @IsOptional()
  @IsString()
  sede?: string;
}

export class CrearIntegradorDto {
  @ApiProperty({ example: 'SIGA', maxLength: 120 })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(120, { message: 'El nombre admite como máximo 120 caracteres.' })
  nombre!: string;
}

export class ErrorFilaCifrasDto {
  @ApiProperty({ example: 1 })
  fila!: number;

  @ApiProperty({ example: 'genero' })
  columna!: string;

  @ApiProperty({ example: 'La columna genero debe ser uno de: Femenino, Masculino, No binario, No informa.' })
  mensaje!: string;
}

export class ResultadoEnvioCifrasDto {
  @ApiProperty({ example: 1 })
  filasOk!: number;

  @ApiProperty({ example: 0 })
  filasError!: number;

  @ApiProperty({ type: [ErrorFilaCifrasDto] })
  errores!: ErrorFilaCifrasDto[];
}

export class IntegradorPublicoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  activo!: boolean;

  @ApiProperty({ nullable: true })
  ultimoUsoEn!: Date | null;

  @ApiProperty({ nullable: true })
  revocadoEn!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class IntegradorCreadoDto extends IntegradorPublicoDto {
  @ApiProperty({
    description: 'Clave en claro. Solo se devuelve en esta respuesta. No se vuelve a mostrar ni se guarda.',
  })
  clave!: string;
}
