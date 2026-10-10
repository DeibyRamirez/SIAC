import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearProgramaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre!: string;

  @IsString()
  @IsIn(['Pregrado', 'Posgrado'])
  nivel!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  facultad?: string;
}
