import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, ValidateBy, ValidationOptions } from 'class-validator';

import { prepararUrlInformePowerBi } from '../validar-url-informe';

const MENSAJE_URL_INFORME =
  'La URL debe ser https://app.powerbi.com/reportEmbed con reportId y ctid (GUID). «Publicar en la web» (/view?r=) no se acepta.';

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
      'Enlace reportEmbed (reportId y ctid). También acepta el iframe pegado desde Power BI. No se acepta /view?r=.',
    example:
      'https://app.powerbi.com/reportEmbed?reportId=00000000-0000-0000-0000-000000000001&ctid=00000000-0000-0000-0000-000000000002',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  @EsUrlInformePowerBi()
  urlPublica!: string;
}
