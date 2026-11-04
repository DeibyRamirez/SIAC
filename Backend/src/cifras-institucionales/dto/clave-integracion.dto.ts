import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { CATEGORIAS_CIFRAS } from '../categorias';

export class CrearClaveIntegracionDto {
  @ApiProperty({ example: 'FEAT', description: 'Nombre del sistema integrador.' })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  nombre!: string;

  @ApiProperty({
    type: [String],
    example: ['estudiantes'],
    description: 'Categorías que esta clave puede escribir.',
    enum: CATEGORIAS_CIFRAS,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Indique al menos una categoría.' })
  @IsIn([...CATEGORIAS_CIFRAS], { each: true, message: 'Categoría no reconocida.' })
  categorias!: string[];
}

export class ActualizarClaveIntegracionDto {
  @ApiPropertyOptional({ description: 'false revoca la clave sin borrarla.' })
  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  @ApiPropertyOptional({ type: [String], enum: CATEGORIAS_CIFRAS })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Indique al menos una categoría.' })
  @IsIn([...CATEGORIAS_CIFRAS], { each: true, message: 'Categoría no reconocida.' })
  categorias?: string[];
}
