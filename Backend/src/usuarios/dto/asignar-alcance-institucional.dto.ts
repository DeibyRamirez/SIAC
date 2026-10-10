import { IsBoolean } from 'class-validator';

export class AsignarAlcanceInstitucionalDto {
  @IsBoolean()
  responsable!: boolean;
}
