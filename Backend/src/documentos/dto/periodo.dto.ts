import { ApiProperty } from '@nestjs/swagger';

export class PeriodoActualDto {
  @ApiProperty({ example: '2026-2', pattern: '^\\d{4}-[12]$' })
  periodo!: string;

  @ApiProperty({ example: 'America/Bogota' })
  zonaHoraria!: string;
}

export class PeriodosConDatosDto {
  @ApiProperty({
    type: [String],
    example: ['2027-2', '2026-2'],
    description: 'Periodos con evidencias visibles, incluidos los ya cerrados. No se ocultan ni se borran.',
  })
  periodos!: string[];
}
