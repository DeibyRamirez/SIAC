import { IsISO8601, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Datos que el Administrador registra a mano junto con el PDF de la resolución MEN. */
export class CargarResolucionDto {
  /** Número real de la resolución (p. ej. «12345»). */
  @IsString()
  @IsNotEmpty({ message: 'El número de la resolución es obligatorio.' })
  @MaxLength(60)
  numero!: string;

  /** Fecha real de la resolución (AAAA-MM-DD). */
  @IsISO8601({ strict: true }, { message: 'La fecha de la resolución debe tener el formato AAAA-MM-DD.' })
  fechaResolucion!: string;
}
