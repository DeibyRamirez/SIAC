type VariablesEntorno = Record<string, string | undefined>;

function leerEnteroPositivo(
  entorno: VariablesEntorno,
  clave: string,
  defecto: number,
): number {
  const crudo = entorno[clave]?.trim();
  if (!crudo) return defecto;
  const valor = Number.parseInt(crudo, 10);
  return Number.isInteger(valor) && valor > 0 ? valor : defecto;
}

/** Intentos permitidos por IP en POST /auth/login (ventana `AUTH_LOGIN_LIMITE_TTL_MS`). */
export function limiteLoginIntentos(entorno: VariablesEntorno = process.env): number {
  return leerEnteroPositivo(entorno, 'AUTH_LOGIN_LIMITE_INTENTOS', 5);
}

/** Duración de la ventana del límite de login, en milisegundos. */
export function limiteLoginTtlMs(entorno: VariablesEntorno = process.env): number {
  return leerEnteroPositivo(entorno, 'AUTH_LOGIN_LIMITE_TTL_MS', 60_000);
}
