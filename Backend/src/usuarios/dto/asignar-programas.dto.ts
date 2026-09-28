import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class AsignarProgramasDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  programaIds!: string[];
}
