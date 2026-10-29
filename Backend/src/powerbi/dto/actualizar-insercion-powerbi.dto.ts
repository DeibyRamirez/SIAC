import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID, ValidateIf } from 'class-validator';

/**
 * Identificadores del informe y el interruptor. El secreto de Azure no viaja en este cuerpo:
 * solo existe en las variables de entorno del servidor.
 */
export class ActualizarInsercionPowerBiDto {
  @ApiPropertyOptional({
    description:
      'Enciende la inserción con token. Apagado, el dashboard conserva el comportamiento actual.',
  })
  @IsOptional()
  @IsBoolean()
  habilitado?: boolean;

  @ApiPropertyOptional({
    description: 'Id del área de trabajo (UUID). Cadena vacía lo borra. No es un secreto.',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsOptional()
  @ValidateIf((_, valor) => valor !== '')
  @IsUUID()
  workspaceId?: string;

  @ApiPropertyOptional({
    description: 'Id del informe (UUID). Cadena vacía lo borra. No es un secreto.',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsOptional()
  @ValidateIf((_, valor) => valor !== '')
  @IsUUID()
  reportId?: string;
}
