import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ActualizarInformePowerBiDto {
  @ApiProperty({
    description: 'URL pública de Power BI o código iframe pegado desde «Publicar en la web».',
    example: 'https://app.powerbi.com/view?r=eyJrIjoiLi4uIn0',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  urlPublica!: string;
}
