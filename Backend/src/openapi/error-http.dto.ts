import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Cuerpo que escribe `FiltroExcepcionHttp` en cualquier error HTTP.
 * No altera la respuesta: solo describe el contrato.
 */
export class ErrorHttpDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    description:
      'Mensaje en español. Si la validación devuelve una lista, el filtro la une con «, ».',
    example: 'pagina debe ser un número entero.',
  })
  message!: string;

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  @ApiPropertyOptional({
    description:
      'Solo cuando NODE_ENV es distinto de production y el estado es 500. No se envía en producción.',
  })
  detalle?: string;
}
