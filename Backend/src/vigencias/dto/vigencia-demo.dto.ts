import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

export class IniciarDemoVigenciaDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  entidadId!: string;

  @ApiProperty({ enum: ['Programa', 'Institucion'] })
  @IsIn(['Programa', 'Institucion'])
  alcance!: 'Programa' | 'Institucion';
}

export class DetenerDemoVigenciaDto extends IniciarDemoVigenciaDto {}
