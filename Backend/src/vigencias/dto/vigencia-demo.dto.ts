import { IsIn, IsString, MinLength } from 'class-validator';

export class IniciarDemoVigenciaDto {
  @IsString()
  @MinLength(1)
  entidadId!: string;

  @IsIn(['Programa', 'Institucion'])
  alcance!: 'Programa' | 'Institucion';
}

export class DetenerDemoVigenciaDto extends IniciarDemoVigenciaDto {}
