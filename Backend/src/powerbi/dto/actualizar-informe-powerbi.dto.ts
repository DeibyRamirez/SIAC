import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, ValidateBy, ValidationOptions } from 'class-validator';

import { prepararUrlInformePowerBi } from '../validar-url-informe';

const MENSAJE_URL_INFORME =
  'La URL debe ser https://app.powerbi.com/view?r=... o un enlace seguro https://app.powerbi.com/reportEmbed con reportId y ctid (GUID).';

function EsUrlInformePowerBi(opciones?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'esUrlInformePowerBi',
      validator: {
        validate: (valor: unknown) =>
          typeof valor === 'string' && prepararUrlInformePowerBi(valor).length > 0,
        defaultMessage: () => MENSAJE_URL_INFORME,
      },
    },
    opciones,
  );
}

export class ActualizarInformePowerBiDto {
  @ApiProperty({
    description:
      'URL de «Publicar en la web» (https://app.powerbi.com/view?r=...) o enlace seguro reportEmbed (reportId y ctid). También acepta el iframe pegado desde Power BI.',
    example: 'https://app.powerbi.com/view?r=eyJrIjoiLi4uIn0',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  @EsUrlInformePowerBi()
  urlPublica!: string;
}
