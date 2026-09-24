import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CrearProgramaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre!: string;

  @IsString()
  @IsIn(['Pregrado', 'Posgrado'])
  nivel!: string;
}
