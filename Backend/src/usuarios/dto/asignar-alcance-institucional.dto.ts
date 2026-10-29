import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AsignarAlcanceInstitucionalDto {
  @ApiProperty({ description: 'true asigna la responsabilidad del proceso institucional.' })
  @IsBoolean()
  responsable!: boolean;
}
